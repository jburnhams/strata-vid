export type AssetType = 'video' | 'gpx';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  src: string; // Blob URL
  file?: File; // Original file object
}

export interface Clip {
  id: string;
  assetId: string;
  start: number; // Start time in the timeline (seconds)
  duration: number; // Duration of the clip (seconds)
  // Future: inPoint, outPoint for trimming
}

export interface ProjectState {
  assets: Asset[];
  timeline: Clip[];
  selectedAssetId: string | null;
}
