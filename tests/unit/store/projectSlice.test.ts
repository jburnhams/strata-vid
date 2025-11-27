
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createProjectSlice } from '../../../src/store/slices/projectSlice';
import { createTimelineSlice } from '../../../src/store/slices/timelineSlice';
import { createAssetsSlice } from '../../../src/store/slices/assetsSlice';
import { StoreState } from '../../../src/store/types';
import { AssetLoader } from '../../../src/services/AssetLoader';

// Mock AssetLoader
jest.mock('../../../src/services/AssetLoader');

describe('projectSlice', () => {
  const useTestStore = create<StoreState>()(
      immer((...a) => ({
          // @ts-ignore
          ...createProjectSlice(...a),
          // @ts-ignore
          ...createTimelineSlice(...a),
          // @ts-ignore
          ...createAssetsSlice(...a),
      }))
  );

  beforeEach(() => {
      useTestStore.setState({
          id: 'initial',
          assets: {},
          tracks: {},
          clips: {},
          trackOrder: []
      });
      jest.clearAllMocks();
  });

  it('should set new settings', () => {
    const { getState } = useTestStore;
    const initialSettings = getState().settings;
    expect(initialSettings.width).toBe(1920);

    getState().setSettings({ width: 1280, previewQuality: 'low' });

    const newSettings = getState().settings;
    expect(newSettings.width).toBe(1280);
    expect(newSettings.previewQuality).toBe('low');
    expect(newSettings.height).toBe(1080); // Should not change
  });

  it('should load a project and revoke old assets', () => {
    const { getState, setState } = useTestStore;

    const oldAsset = { id: 'asset-1', name: 'Old Asset', type: 'video', src: 'old.mp4' };

    // Set up some initial state
    // @ts-ignore
    setState({
      id: 'old-project',
      assets: { 'asset-1': oldAsset },
      clips: { 'clip-1': { id: 'clip-1', assetId: 'asset-1', trackId: 'track-1', start: 0, duration: 10 } },
    });

    const newProject = {
      id: 'new-project',
      settings: { width: 800, height: 600, fps: 24, duration: 100, previewQuality: 'medium', snapToGrid: false, allowOverlaps: true, simplificationTolerance: 0.0002 },
      assets: { 'asset-2': { id: 'asset-2', name: 'New Asset', type: 'video', src: 'file.mp4' } },
      tracks: { 'track-2': { id: 'track-2', name: 'New Track' } },
      clips: { 'clip-2': { id: 'clip-2', assetId: 'asset-2', trackId: 'track-2', start: 5, duration: 15 } },
      trackOrder: ['track-2'],
    };

    // @ts-ignore
    getState().loadProject(newProject);

    const state = getState();
    expect(state.id).toBe('new-project');
    expect(state.settings.width).toBe(800);
    expect(state.assets['asset-2'].name).toBe('New Asset');
    expect(state.clips['clip-2'].start).toBe(5);
    expect(state.trackOrder).toEqual(['track-2']);
    // Check that old state is gone
    expect(state.clips['clip-1']).toBeUndefined();
    // Check that playback is reset
    expect(state.currentTime).toBe(0);
    expect(state.isPlaying).toBe(false);

    // Verify J5: Old assets should be revoked
    expect(AssetLoader.revokeAsset).toHaveBeenCalledWith(oldAsset);
  });
});
