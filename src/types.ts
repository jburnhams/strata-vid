import { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

export type AssetType = 'video' | 'gpx' | 'image' | 'audio';

export interface GpxPoint {
  time: number; // timestamp in ms
  lat: number;
  lon: number;
  ele?: number;
  dist?: number; // meters from start
}

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
  src: string; // Blob URL or source path
  file?: File; // Original file object
  geoJson?: FeatureCollection<Geometry, GeoJsonProperties>;
  gpxPoints?: GpxPoint[];
  stats?: GpxStats;
  duration?: number; // Video/Audio duration in seconds
  resolution?: { width: number; height: number };
  creationTime?: Date;
  creationTimeSource?: 'metadata' | 'file' | 'none';
  thumbnail?: string; // Blob URL for thumbnail
  waveform?: number[]; // Array of peak values (0-1) for audio visualization
}

export interface TrackStyle {
  color: string;
  weight: number;
  opacity: number;
}

export interface MarkerStyle {
  color: string; // hex or name
  type?: 'dot' | 'pin';
}

export interface OverlayProperties {
  x: number; // % of screen width
  y: number; // % of screen height
  width: number; // % of screen width
  height: number; // % of screen height
  rotation: number; // degrees
  opacity: number; // 0-1
  zIndex: number;
  filter?: string; // CSS filter string
  // Map specific properties
  mapStyle?: 'osm' | 'mapbox' | 'satellite' | 'dark' | 'custom';
  customMapStyleUrl?: string;
  mapZoom?: number;
  trackStyle?: TrackStyle;
  markerStyle?: MarkerStyle;
  heatmap?: {
    enabled: boolean;
    dataSource: 'speed' | 'elevation';
  };
  showElevationProfile?: boolean;
  // Data overlay specific properties
  dataOverlay?: DataOverlayOptions;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  backgroundColor?: string;
  textAlign: 'left' | 'center' | 'right';
}

export interface DataOverlayOptions {
  showSpeed: boolean;
  showDistance: boolean;
  showElevation: boolean;
  speedUnit: 'kmh' | 'mph' | 'm/s';
  distanceUnit: 'km' | 'mi' | 'm';
  elevationUnit: 'm' | 'ft';
}

export type TransitionType = 'crossfade' | 'fade' | 'wipe';

export interface Transition {
  type: TransitionType;
  duration: number;
}

export interface ExtraTrack {
  assetId: string; // Reference to the GPX asset
  trackStyle?: TrackStyle;
  markerStyle?: MarkerStyle;
  syncOffset?: number; // Override or specific sync offset
}

export interface Marker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export interface Keyframe {
  id: string;
  time: number; // relative to clip start
  value: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface Clip {
  id: string;
  assetId: string;
  trackId: string;
  start: number; // Global timeline start (seconds)
  duration: number; // Playback duration (seconds)
  offset: number; // Source media start time (trimming)
  properties: OverlayProperties;
  textStyle?: TextStyle;
  type: 'video' | 'audio' | 'image' | 'map' | 'text' | 'html' | 'data';
  content?: string; // For text/html
  syncOffset?: number; // For map/gpx clips: offset in ms between video time 0 and GPX time
  extraTrackAssets?: ExtraTrack[]; // For map clips: additional GPX tracks to display
  transitionIn?: Transition;
  playbackRate?: number;
  keyframes?: Record<string, Keyframe[]>;
  volume: number; // 0-1 (or >1 for boost)
}

export type TrackViewMode = 'frames' | 'waveform' | 'both';

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'overlay';
  label: string;
  isMuted: boolean;
  isLocked: boolean;
  volume: number; // 0-1 (or >1 for boost)
  clips: string[]; // Array of Clip IDs
  viewMode?: TrackViewMode;
}

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  duration: number; // Total project duration in seconds
  previewQuality: 'low' | 'medium' | 'high';
  snapToGrid: boolean;
  allowOverlaps: boolean;
  simplificationTolerance: number; // for GPX track simplification
}

// Note: The full Project State structure including slices is defined in src/store/types.ts
// This interface below might be deprecated or used as a snapshot type.
export interface ProjectState {
  id: string;
  settings: ProjectSettings;
  assets: Record<string, Asset>;
  tracks: Record<string, Track>;
  clips: Record<string, Clip>;
  trackOrder?: string[];
  selectedAssetId?: string | null;
  currentTime?: number;
  isPlaying?: boolean;
  playbackRate?: number;
}

// State shape used for loading/saving projects
export interface DeserializedState {
  id: string;
  settings: ProjectSettings;
  assets: Record<string, Asset>;
  tracks: Record<string, Track>;
  clips: Record<string, Clip>;
  trackOrder: string[];
}
