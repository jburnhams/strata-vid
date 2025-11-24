import { Asset, Clip, Track, ProjectSettings } from '../types';

export interface ProjectSlice {
  id: string;
  settings: ProjectSettings;
  setSettings: (settings: Partial<ProjectSettings>) => void;
}

export interface AssetsSlice {
  assets: Record<string, Asset>;
  selectedAssetId: string | null;
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  selectAsset: (id: string | null) => void;
}

export interface TimelineSlice {
  tracks: Record<string, Track>;
  clips: Record<string, Clip>;
  trackOrder: string[]; // Array of Track IDs to maintain order
  selectedClipId: string | null;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  addClip: (clip: Clip) => void;
  removeClip: (id: string) => void;
  selectClip: (id: string | null) => void;
  moveClip: (id: string, newStart: number, newTrackId?: string) => void;
  resizeClip: (id: string, newDuration: number, newOffset?: number) => void;
  duplicateClip: (id: string) => void;
  updateClipSyncOffset: (id: string, syncOffset: number) => void;
  updateClipProperties: (id: string, properties: any) => void; // Partial<OverlayProperties> but using any to avoid circular dep issues in types for now if needed, or import it.
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
  setLoading: (isLoading: boolean, message?: string | null) => void;
  addToast: (message: string, type?: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

export type StoreState = ProjectSlice & AssetsSlice & TimelineSlice & PlaybackSlice & UiSlice;
