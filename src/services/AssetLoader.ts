import { Asset, AssetType } from '../types';
import { BlobSource, Input, ALL_FORMATS } from 'mediabunny';
import { parseGpxFile } from '../utils/gpxParser';

// Helper interface for Mediabunny Input to handle potential type mismatches
interface IMediabunnyInput {
    computeDuration?: () => Promise<number>;
    getFormat?: () => Promise<{ duration?: number; tags?: Record<string, string> }>;
    getVideoTracks: () => Promise<any[]>;
    dispose: () => void;
}

export class AssetLoader {
  static async loadAsset(file: File): Promise<Asset> {
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
    } else if (type === 'gpx') {
      await this.enrichGpxMetadata(asset, file);
    }

    return asset;
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

  private static async enrichGpxMetadata(asset: Asset, file: File): Promise<void> {
    try {
        const { geoJson, stats } = await parseGpxFile(file);
        asset.geoJson = geoJson;
        asset.stats = stats;
    } catch (e) {
        console.warn("Failed to parse GPX", e);
    }
  }
}
