import { Asset, AssetType } from '../types';
import { parseGpxFile } from '../utils/gpxParser';
// We are importing everything from mediabunny to find the right classes.
// Based on the d.ts, we can use Input and BlobSource.
import { Input, BlobSource, ALL_FORMATS } from 'mediabunny';

// Helper to generate UUIDs
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const determineType = (file: File): AssetType => {
  if (file.name.toLowerCase().endsWith('.gpx')) return 'gpx';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  throw new Error(`Unsupported file type: ${file.type}`);
};

const getVideoMetadata = async (file: File): Promise<{ duration: number; resolution: { width: number; height: number } }> => {
  // Use Mediabunny for metadata extraction
  // Create a BlobSource from the file
  const source = new BlobSource(file);
  // Create an Input object
  // We need to provide the list of formats. ALL_FORMATS covers everything.
  const input = new Input({ source, formats: ALL_FORMATS });

  try {
    // Compute duration (looks at all tracks)
    const duration = await input.computeDuration();

    // Get video tracks to find resolution
    const videoTracks = await input.getVideoTracks();
    let width = 0;
    let height = 0;

    if (videoTracks.length > 0) {
        const track = videoTracks[0];
        width = track.displayWidth;
        height = track.displayHeight;
    }

    return {
        duration,
        resolution: { width, height }
    };
  } finally {
    // Always dispose of the input to free resources
    input.dispose();
  }
};

export const AssetLoader = {
  loadAsset: async (file: File): Promise<Asset> => {
    const type = determineType(file);
    const assetId = generateId();
    const src = URL.createObjectURL(file);

    let asset: Asset = {
      id: assetId,
      name: file.name,
      type,
      src,
      file,
    };

    try {
      if (type === 'gpx') {
        const { geoJson, stats } = await parseGpxFile(file);
        asset.geoJson = geoJson;
        asset.stats = stats;
      } else if (type === 'video') {
        const metadata = await getVideoMetadata(file);
        asset.duration = metadata.duration;
        asset.resolution = metadata.resolution;
      } else if (type === 'image') {
         // For images, we could also get resolution, but skipping for now as prompt focuses on video/gpx
      } else if (type === 'audio') {
          const metadata = await getVideoMetadata(file);
          asset.duration = metadata.duration;
      }
    } catch (error) {
      console.error(`Failed to load asset metadata for ${file.name}`, error);
      throw error;
    }

    return asset;
  },
  determineType,
  getVideoMetadata
};
