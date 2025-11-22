import { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

export type AssetType = 'video' | 'gpx';

export interface GpxStats {
  distance: {
    total: number; // meters
  };
  elevation: {
    gain: number;
    loss: number;
    max: number;
    min: number;
    average: number;
  };
  time: {
    start: Date;
    end: Date;
    duration: number; // milliseconds
  };
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  src: string; // Blob URL
  file?: File; // Original file object
  geoJson?: FeatureCollection<Geometry, GeoJsonProperties>;
  stats?: GpxStats;
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
