
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createProjectSlice } from '../../../src/store/slices/projectSlice';
import { createTimelineSlice } from '../../../src/store/slices/timelineSlice';
import { createAssetsSlice } from '../../../src/store/slices/assetsSlice';
import { StoreState } from '../../../src/store/types';

describe('projectSlice', () => {
  it('should set new settings', () => {
    const useTestStore = create<StoreState>()(
        immer((...a) => ({
            ...createProjectSlice(...a),
            ...createTimelineSlice(...a),
            ...createAssetsSlice(...a),
        }))
    );
    const { getState, setState } = useTestStore;

    const initialSettings = getState().settings;
    expect(initialSettings.width).toBe(1920);

    getState().setSettings({ width: 1280, previewQuality: 'low' });

    const newSettings = getState().settings;
    expect(newSettings.width).toBe(1280);
    expect(newSettings.previewQuality).toBe('low');
    expect(newSettings.height).toBe(1080); // Should not change
  });

  it('should load a project', () => {
    const useTestStore = create<StoreState>()(
        immer((...a) => ({
            ...createProjectSlice(...a),
            ...createTimelineSlice(...a),
            ...createAssetsSlice(...a),
        }))
    );
    const { getState, setState } = useTestStore;

    // Set up some initial state
    setState({
      id: 'old-project',
      clips: { 'clip-1': { id: 'clip-1', assetId: 'asset-1', trackId: 'track-1', start: 0, end: 10 } },
    });

    const newProject = {
      id: 'new-project',
      settings: { width: 800, height: 600, fps: 24, duration: 100, previewQuality: 'medium', snapToGrid: false, allowOverlaps: true, simplificationTolerance: 0.0002 },
      assets: { 'asset-2': { id: 'asset-2', name: 'New Asset', type: 'video', source: 'file.mp4' } },
      tracks: { 'track-2': { id: 'track-2', name: 'New Track' } },
      clips: { 'clip-2': { id: 'clip-2', assetId: 'asset-2', trackId: 'track-2', start: 5, end: 15 } },
      trackOrder: ['track-2'],
    };

    getState().loadProject(newProject as any);

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
  });
});
