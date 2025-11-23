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
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  addClip: (clip: Clip) => void;
  removeClip: (id: string) => void;
  moveClip: (id: string, newStart: number, newTrackId?: string) => void;
  resizeClip: (id: string, newDuration: number, newOffset?: number) => void;
  updateClipSyncOffset: (id: string, syncOffset: number) => void;
}

export interface PlaybackSlice {
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  setPlaybackState: (state: Partial<Omit<PlaybackSlice, 'setPlaybackState'>>) => void;
}

export type StoreState = ProjectSlice & AssetsSlice & TimelineSlice & PlaybackSlice;
