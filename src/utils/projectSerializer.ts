import { StoreState } from '../store/types';
import { Asset, ProjectSettings, Track, Clip } from '../types';

export interface SerializedAsset extends Omit<Asset, 'file' | 'src'> {
  src: null; // Explicitly null in storage
  fileName: string; // To help identify the file needed
}

export interface SerializedProject {
  version: number;
  project: {
    id: string;
    settings: ProjectSettings;
  };
  assets: Record<string, SerializedAsset>;
  timeline: {
    tracks: Record<string, Track>;
    clips: Record<string, Clip>;
    trackOrder: string[];
  };
  lastSaved: number;
}

const CURRENT_VERSION = 1;

export function serializeProject(state: StoreState): string {
  const serializedAssets: Record<string, SerializedAsset> = {};

  Object.entries(state.assets).forEach(([id, asset]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { file, src, ...rest } = asset;
    serializedAssets[id] = {
      ...rest,
      src: null,
      fileName: file ? file.name : asset.name,
    };
  });

  const serialized: SerializedProject = {
    version: CURRENT_VERSION,
    project: {
      id: state.id,
      settings: state.settings,
    },
    assets: serializedAssets,
    timeline: {
      tracks: state.tracks,
      clips: state.clips,
      trackOrder: state.trackOrder,
    },
    lastSaved: Date.now(),
  };

  return JSON.stringify(serialized, null, 2);
}

export interface DeserializedState {
    id: string;
    settings: ProjectSettings;
    assets: Record<string, Asset>;
    tracks: Record<string, Track>;
    clips: Record<string, Clip>;
    trackOrder: string[];
}

export function deserializeProject(json: string): DeserializedState | null {
  try {
    const serialized: SerializedProject = JSON.parse(json);

    // Basic validation
    if (!serialized.version || !serialized.project || !serialized.timeline) {
      console.error('Invalid project file format: missing required fields');
      return null;
    }

    if (serialized.version > CURRENT_VERSION) {
        console.warn(`Project file version ${serialized.version} is newer than current version ${CURRENT_VERSION}. Some features may not work.`);
    }

    // Reconstruct assets (src will be empty string, file will be undefined)
    const assets: Record<string, Asset> = {};
    Object.entries(serialized.assets).forEach(([id, sAsset]) => {
      // We cast to Asset because we are providing the required 'src' as a placeholder
      // The application must handle assets with empty src (missing file)
      assets[id] = {
        ...sAsset,
        src: '',
        file: undefined,
      } as Asset;
    });

    return {
      id: serialized.project.id,
      settings: serialized.project.settings,
      assets,
      tracks: serialized.timeline.tracks,
      clips: serialized.timeline.clips,
      trackOrder: serialized.timeline.trackOrder,
    };
  } catch (e) {
    console.error('Failed to parse project file', e);
    return null;
  }
}

export function applyProjectState(store: StoreState, state: DeserializedState) {
  // Clear existing
  Object.keys(store.assets).forEach(id => store.removeAsset(id));
  Object.keys(store.tracks).forEach(id => store.removeTrack(id));

  store.setSettings(state.settings);

  Object.values(state.assets).forEach((asset) => store.addAsset(asset));

  if (state.trackOrder) {
    state.trackOrder.forEach(trackId => {
        const originalTrack = state.tracks[trackId];
        if (!originalTrack) return;
        store.addTrack({ ...originalTrack, clips: [] });
        originalTrack.clips.forEach(clipId => {
            const clip = state.clips[clipId];
            if (clip) store.addClip(clip);
        });
    });
  }
}
