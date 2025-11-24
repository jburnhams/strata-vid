import { StoreState } from '../store/types';
import { Asset, ProjectSettings, Track, Clip, DeserializedState } from '../types';

/**
 * Serialized representation of an Asset.
 * We deliberately strip the 'file' object and 'src' URL because:
 * 1. 'file' objects (File API) cannot be serialized to JSON.
 * 2. 'src' blob URLs are temporary and revoked on page reload.
 */
export interface SerializedAsset extends Omit<Asset, 'file' | 'src'> {
  src: null; // Explicitly null in storage
  fileName: string; // To help identify the file needed for restoration
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

/**
 * Serializes the current project state to a JSON string.
 * This is used for saving projects to disk or auto-saving to localStorage.
 */
export function serializeProject(state: StoreState): string {
  const serializedAssets: Record<string, SerializedAsset> = {};

  Object.entries(state.assets).forEach(([id, asset]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { file, src, ...rest } = asset;

    // We store the file name to help the user identify missing media later.
    // In a future version, this could be used to prompt re-linking.
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

/**
 * Deserializes a JSON string into a usable project state.
 * Returns null if parsing fails or validation errors occur.
 */
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

    // Reconstruct assets
    // NOTE: The 'src' is set to empty string. The application (VideoPlayer) must handle this.
    // Currently, there is no automatic mechanism to restore the file handles.
    // The user would technically need to re-upload files or we need a re-linking UI.
    const assets: Record<string, Asset> = {};
    Object.entries(serialized.assets).forEach(([id, sAsset]) => {
      assets[id] = {
        ...sAsset,
        src: '', // Placeholder
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
