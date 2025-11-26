import { Asset, AssetType } from '../types';
import { BlobSource, Input, ALL_FORMATS } from 'mediabunny';
import { parseGpxFile, simplifyTrack } from '../utils/gpxParser';
import { extractAudioMetadata } from '../utils/audioUtils';
import { ConcurrencyLimiter } from '../utils/concurrency';

// Helper interface for Mediabunny Input to handle potential type mismatches
interface IMediabunnyInput {
    computeDuration?: () => Promise<number>;
    getFormat?: () => Promise<{ duration?: number; tags?: Record<string, string> }>;
    getVideoTracks: () => Promise<any[]>;
    dispose: () => void;
}

export class AssetLoader {
  // Limit concurrent thumbnail generations to avoid browser freeze
  private static thumbnailLimiter = new ConcurrencyLimiter(2);

  static async loadAsset(file: File, options: { simplificationTolerance?: number } = {}): Promise<Asset> {
    const type = this.determineType(file);
    const id = crypto.randomUUID();
    const asset: Asset = {
      id,
      name: file.name,
      type,
      src: URL.createObjectURL(file),
      file,
    };

    if (type === 'video') {
      await this.enrichVideoMetadata(asset, file);
      // Thumbnail is now loaded separately via loadThumbnail
    } else if (type === 'gpx') {
      await this.enrichGpxMetadata(asset, file, options.simplificationTolerance);
    } else if (type === 'audio') {
      await this.enrichAudioMetadata(asset, file);
    }

    return asset;
  }

  /**
   * Generates a thumbnail for a video file.
   * Uses a concurrency limiter to prevent overwhelming the browser.
   */
  static async loadThumbnail(file: File): Promise<string> {
    return this.thumbnailLimiter.execute(() => this.generateVideoThumbnail(file));
  }

  /**
   * Revokes object URLs associated with an asset.
   * Call this when removing an asset from the project.
   */
  static revokeAsset(asset: Asset) {
    if (asset.src && asset.src.startsWith('blob:')) {
      URL.revokeObjectURL(asset.src);
    }
    if (asset.thumbnail && asset.thumbnail.startsWith('blob:')) {
      URL.revokeObjectURL(asset.thumbnail);
    }
  }

  /**
   * Re-processes a GPX asset with a new simplification tolerance.
   */
  static async reprocessGpxAsset(asset: Asset, tolerance: number): Promise<Pick<Asset, 'geoJson' | 'stats' | 'gpxPoints'>> {
    if (asset.type !== 'gpx' || !asset.file) {
      throw new Error('Asset is not a valid GPX asset with a source file.');
    }

    const { geoJson, stats, points } = await parseGpxFile(asset.file);
    const simplifiedPoints = simplifyTrack(points, tolerance);

    console.log(`Re-processed GPX track from ${points.length} to ${simplifiedPoints.length} points with tolerance ${tolerance}.`);

    return {
      geoJson,
      stats,
      gpxPoints: simplifiedPoints,
    };
  }

  public static determineType(file: File): AssetType {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('image/')) return 'image';
    if (file.name.toLowerCase().endsWith('.gpx')) return 'gpx';
    if (file.type.startsWith('audio/')) return 'audio';
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  private static async enrichVideoMetadata(asset: Asset, file: File): Promise<void> {
    let input: IMediabunnyInput | undefined;

    try {
        const source = new BlobSource(file);
        // Cast to unknown first to bypass type check against original Input class
        input = new Input({ source, formats: ALL_FORMATS }) as unknown as IMediabunnyInput;

        let formatData: { duration?: number; tags?: Record<string, string> } | undefined;

        if (input.getFormat) {
             formatData = await input.getFormat();
             if (formatData?.duration) asset.duration = formatData.duration;

             // Try to extract creation time from metadata
             if (formatData?.tags && formatData.tags.creation_time) {
                 const date = new Date(formatData.tags.creation_time);
                 if (!isNaN(date.getTime())) {
                     asset.creationTime = date;
                     asset.creationTimeSource = 'metadata';
                 }
             }
        }

        // Use computeDuration as fallback or primary if getFormat didn't give duration
        if (!asset.duration && input.computeDuration) {
             const duration = await input.computeDuration();
             if (typeof duration === 'number') asset.duration = duration;
        }

        const videoTracks = await input.getVideoTracks();
        if (videoTracks.length > 0) {
            const track = videoTracks[0];
            const w = track.displayWidth || track.width;
            const h = track.displayHeight || track.height;

            if (w && h) {
                asset.resolution = { width: w, height: h };
            }
        }

    } catch (error) {
        console.warn('Failed to extract video metadata via mediabunny', error);
    } finally {
        if (input) {
            input.dispose();
        }
    }

    // Fallback to file creation time if metadata unavailable
    if (!asset.creationTime) {
        // file.lastModified is reliable in browsers
        asset.creationTime = new Date(file.lastModified);
        asset.creationTimeSource = 'file';
    }
  }

  private static async enrichGpxMetadata(asset: Asset, file: File, tolerance: number = 0.0001): Promise<void> {
    try {
        const { geoJson, stats, points } = await parseGpxFile(file);

        const simplifiedPoints = simplifyTrack(points, tolerance);

        console.log(`GPX track simplified from ${points.length} to ${simplifiedPoints.length} points with tolerance ${tolerance}.`);

        asset.geoJson = geoJson;
        asset.stats = stats;
        asset.gpxPoints = simplifiedPoints;

    } catch (e) {
        console.warn("Failed to parse GPX", e);
    }
  }

  private static async enrichAudioMetadata(asset: Asset, file: File): Promise<void> {
    try {
      const { duration, waveform } = await extractAudioMetadata(file);
      asset.duration = duration;
      asset.waveform = waveform;
    } catch (e) {
      console.warn('Failed to extract audio metadata:', e);
    }
  }

  private static async generateVideoThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;

      video.onloadeddata = () => {
        video.currentTime = 0; // Trigger seek
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          // Scale down for thumbnail
          const scale = Math.min(1, 320 / video.videoWidth);
          canvas.width = video.videoWidth * scale;
          canvas.height = video.videoHeight * scale;

          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas context');

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(URL.createObjectURL(blob));
            } else {
              reject(new Error('Thumbnail blob creation failed'));
            }
          }, 'image/jpeg', 0.7);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };

      video.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Video load failed'));
      };

      // Timeout safety
      setTimeout(() => {
          URL.revokeObjectURL(url);
          reject(new Error('Thumbnail generation timed out'));
      }, 5000);
    });
  }
}
