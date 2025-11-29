import { Asset, Clip, Track, ProjectSettings, DeserializedState, Transition, Marker, Keyframe, ExtraTrack } from '../types';

export interface ProjectSlice {
  id: string;
  settings: ProjectSettings;
  setSettings: (settings: Partial<ProjectSettings>) => void;
  loadProject: (project: DeserializedState) => void;
}

export interface AssetsSlice {
  assets: Record<string, Asset>;
  selectedAssetId: string | null;
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, asset: Partial<Asset>) => void;
  removeAsset: (id: string) => void;
  selectAsset: (id: string | null) => void;
  reprocessGpxAsset: (id: string, tolerance: number) => Promise<void>;
}

export interface TimelineSlice {
  tracks: Record<string, Track>;
  clips: Record<string, Clip>;
  trackOrder: string[]; // Array of Track IDs to maintain order
  markers: Marker[];
  selectedClipId: string | null;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  addMarker: (marker: Marker) => void;
  removeMarker: (id: string) => void;
  updateMarker: (id: string, marker: Partial<Marker>) => void;
  addClip: (clip: Clip) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, clip: Partial<Clip>) => void;
  selectClip: (id: string | null) => void;
  moveClip: (id: string, newStart: number, newTrackId?: string) => void;
  resizeClip: (id: string, newDuration: number, newOffset?: number) => void;
  duplicateClip: (id: string) => void;
  splitClip: (id: string, time: number) => void;
  rippleDeleteClip: (id: string) => void;
  addTransition: (id: string, transition: Transition) => void;
  updateClipSyncOffset: (id: string, syncOffset: number) => void;
  updateClipPlaybackRate: (id: string, playbackRate: number) => void;
  updateClipProperties: (id: string, properties: any) => void; // Partial<OverlayProperties> but using any to avoid circular dep issues in types for now if needed, or import it.
  addKeyframe: (clipId: string, property: string, keyframe: Keyframe) => void;
  removeKeyframe: (clipId: string, property: string, keyframeId: string) => void;
  updateKeyframe: (clipId: string, property: string, keyframeId: string, update: Partial<Omit<Keyframe, 'id'>>) => void;
  addExtraTrackToClip: (clipId: string, assetId: string) => void;
  removeExtraTrackFromClip: (clipId: string, assetId: string) => void;
  updateExtraTrackOnClip: (clipId: string, assetId: string, update: Partial<Omit<ExtraTrack, 'assetId'>>) => void;
  removeClipsByAssetId: (assetId: string) => void;
}

export interface PlaybackSlice {
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  setPlaybackState: (state: Partial<Omit<PlaybackSlice, 'setPlaybackState'>>) => void;
}

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export interface UiSlice {
  isLoading: boolean;
  loadingMessage: string | null;
  toasts: Toast[];
  zoomLevel: number;
  setLoading: (isLoading: boolean, message?: string | null) => void;
  addToast: (message: string, type?: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  setZoomLevel: (zoomLevel: number) => void;
}

export type StoreState = ProjectSlice & AssetsSlice & TimelineSlice & PlaybackSlice & UiSlice;
