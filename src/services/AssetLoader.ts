import type { Asset, AssetType } from '../types';
import { BlobSource, Input, ALL_FORMATS } from 'mediabunny';
import { parseGpxFile, simplifyTrack } from '../utils/gpxParser';
import { extractAudioMetadata } from '../utils/audioUtils';
import { ConcurrencyLimiter } from '../utils/concurrency';

import type { VideoMetadata } from '../types';

/** Packets read to estimate a video's frame rate and bitrate: enough for a steady figure, few enough for a long file. */
const STATS_PACKETS = 300;

/**
 * A date a file says it was made, or null when it gives none or one that can't be right. MP4 writes
 * 0 (1904) or the Unix epoch when the camera's clock was never set, so anything before 1980 is
 * treated as missing.
 */
const plausibleDate = (date: Date | null | undefined): Date | null =>
  date instanceof Date && !isNaN(date.getTime()) && date.getUTCFullYear() >= 1980 ? date : null;

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
   * Generates a thumbnail for an asset file.
   * Uses a concurrency limiter to prevent overwhelming the browser.
   */
  static async loadThumbnail(file: File, assetType: AssetType): Promise<string> {
    if (assetType === 'video') {
      return this.thumbnailLimiter.execute(() => this.generateVideoThumbnail(file));
    }
    // Placeholder for other asset type thumbnails (e.g., GPX static map)
    return Promise.resolve('');
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

  /**
   * Reads what the file says about itself through mediabunny's own API: container, duration, the
   * date the file was recorded (`creationTime`, or the tagged date), and each track's codec, size,
   * frame rate, bitrate, sample rate and channels. Until 2026-11-12 this read ffprobe-style names
   * (`codec_name`, `bit_rate`, `tags.creation_time`) that mediabunny does not have, so most fields
   * were blank and the date always came from the file's modified time (issue #142).
   */
  private static async enrichVideoMetadata(asset: Asset, file: File): Promise<void> {
    let input: Input | undefined;

    try {
        input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
        const videoMetadata: VideoMetadata = {};

        videoMetadata.format = (await input.getFormat()).name;

        const duration = await input.computeDuration();
        if (duration > 0) asset.duration = duration;

        const tags = await input.getMetadataTags();
        const recorded = plausibleDate(tags.creationTime) ?? plausibleDate(tags.date);
        if (recorded) {
            asset.creationTime = recorded;
            asset.creationTimeSource = 'metadata';
        }

        const video = await input.getPrimaryVideoTrack();
        if (video) {
            const [width, height] = [await video.getDisplayWidth(), await video.getDisplayHeight()];
            if (width && height) asset.resolution = { width, height };
            videoMetadata.videoCodec = (await video.getCodec()) ?? undefined;
            const stats = await video.computePacketStats(STATS_PACKETS);
            if (stats.averagePacketRate > 0) videoMetadata.frameRate = Math.round(stats.averagePacketRate * 100) / 100;
            if (stats.averageBitrate > 0) videoMetadata.bitrate = stats.averageBitrate;
        }

        const audio = await input.getPrimaryAudioTrack();
        if (audio) {
            videoMetadata.audioCodec = (await audio.getCodec()) ?? undefined;
            videoMetadata.sampleRate = await audio.getSampleRate();
            videoMetadata.channels = await audio.getNumberOfChannels();
        }

        asset.videoMetadata = videoMetadata;

    } catch (error) {
        console.warn('Failed to extract video metadata via mediabunny', error);
    } finally {
        input?.dispose();
    }

    // Attempt to extract audio waveform for video files
    try {
        const audioData = await extractAudioMetadata(file);
        // Only use audio duration if mediabunny failed (audio duration might be slightly different from video, but close enough)
        if (!asset.duration && audioData.duration) {
            asset.duration = audioData.duration;
        }
        asset.waveform = audioData.waveform;
    } catch (e) {
        // Non-fatal, video might not have audio track or decoding failed
        console.warn('Failed to extract audio from video:', e);
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

        // A GPX file's date is its first timed point: when the recording started (issue #142).
        const started = plausibleDate(points.length > 0 ? new Date(points[0].time) : null);
        asset.creationTime = started ?? undefined;
        asset.creationTimeSource = started ? 'metadata' : 'none';

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
