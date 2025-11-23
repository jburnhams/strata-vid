import { Asset, AssetType } from '../types';
import { BlobSource, Input } from 'mediabunny';
import { parseGpxFile } from '../utils/gpxParser';

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
    let source: BlobSource | undefined;
    let input: Input | undefined;

    try {
        source = new BlobSource(file);
        // @ts-ignore - Input constructor signature mismatch with types or docs
        input = new Input(source);

        // @ts-ignore - computeDuration might be missing in types but present in runtime or vice versa
        if (input && typeof input.computeDuration === 'function') {
             // @ts-ignore
             const duration = await input.computeDuration();
             if (typeof duration === 'number') asset.duration = duration;
        } else if (input && typeof input.getFormat === 'function') {
             const format = await input.getFormat();
             // @ts-ignore - duration on format
             if (format.duration) asset.duration = format.duration;
        }

        if (input) {
            const videoTracks = await input.getVideoTracks();
            if (videoTracks.length > 0) {
                const track = videoTracks[0];
                // @ts-ignore
                const w = track.displayWidth || track.width;
                // @ts-ignore
                const h = track.displayHeight || track.height;

                if (w && h) {
                    asset.resolution = { width: w, height: h };
                }
            }
        }

    } catch (error) {
        console.warn('Failed to extract video metadata via mediabunny', error);
    } finally {
        if (input) {
            input.dispose();
        }
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
