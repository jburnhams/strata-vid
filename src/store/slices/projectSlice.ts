import { StateCreator } from 'zustand';
import { ProjectSlice, StoreState } from '../types';
import { AssetLoader } from '../../services/AssetLoader';

export const createProjectSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  ProjectSlice
> = (set, get) => ({
  id: 'project-1',
  settings: {
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 0,
    previewQuality: 'high',
    snapToGrid: true,
    allowOverlaps: false,
    simplificationTolerance: 0.0001,
  },
  setSettings: (newSettings) =>
    set((state) => {
      Object.assign(state.settings, newSettings);
    }),
  loadProject: (project) => {
    // J5: Revoke existing assets to prevent memory leaks
    const currentAssets = get().assets;
    if (currentAssets) {
        Object.values(currentAssets).forEach((asset) => {
            if (asset) AssetLoader.revokeAsset(asset);
        });
    }

    set((state) => {
      // Load project ID and settings
      state.id = project.id;
      state.settings = project.settings;

      // Load Assets
      // Clear existing first
      state.assets = {};
      Object.assign(state.assets, project.assets);
      state.selectedAssetId = null;

      // Load Timeline
      // Clear existing first
      state.tracks = {};
      state.clips = {};
      state.trackOrder = [];

      Object.assign(state.tracks, project.tracks);
      Object.assign(state.clips, project.clips);
      state.trackOrder = project.trackOrder;

      state.selectedClipId = null;

      // Reset Playback
      state.currentTime = 0;
      state.isPlaying = false;
    });
  },
});
