import { ProjectSettings, Asset, Track, Clip } from '../types';

export interface ProjectSlice {
  settings: ProjectSettings;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
}

export interface AssetsSlice {
  assets: Asset[];
  selectedAssetId: string | null;
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  selectAsset: (id: string | null) => void;
}

export interface TimelineSlice {
  tracks: Track[];
  clips: Record<string, Clip>;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  addClip: (clip: Clip) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  moveClip: (clipId: string, trackId: string, newStart: number) => void;
}

export interface PlaybackSlice {
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  setPlaybackTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackRate: (rate: number) => void;
}

export type StoreState = ProjectSlice & AssetsSlice & TimelineSlice & PlaybackSlice;
