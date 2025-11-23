
import { describe, it, expect, beforeEach } from '@jest/globals';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { Track, Clip } from '../../../src/types';

// Helper to reset store
const resetStore = () => {
  useProjectStore.setState({
    assets: {},
    tracks: {},
    clips: {},
    trackOrder: [],
    currentTime: 0,
    isPlaying: false,
  }); // Default is merge, so actions are preserved
};

describe('Store - Timeline Slice', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should have the correct structure', () => {
    const state = useProjectStore.getState();
    console.log('Store keys:', Object.keys(state));
  });

  it('should add a track', () => {
    const track: Track = {
      id: 'track-1',
      type: 'video',
      label: 'Video 1',
      isMuted: false,
      isLocked: false,
      clips: [],
    };
    useProjectStore.getState().addTrack(track);

    const state = useProjectStore.getState();
    expect(state.tracks['track-1']).toEqual(track);
    expect(state.trackOrder).toContain('track-1');
  });

  it('should remove a track', () => {
    const track: Track = {
      id: 'track-1',
      type: 'video',
      label: 'Video 1',
      isMuted: false,
      isLocked: false,
      clips: [],
    };
    useProjectStore.getState().addTrack(track);
    useProjectStore.getState().removeTrack('track-1');

    const state = useProjectStore.getState();
    expect(state.tracks['track-1']).toBeUndefined();
    expect(state.trackOrder).not.toContain('track-1');
  });

  it('should add a clip', () => {
    const track: Track = {
      id: 'track-1',
      type: 'video',
      label: 'Video 1',
      isMuted: false,
      isLocked: false,
      clips: [],
    };
    useProjectStore.getState().addTrack(track);

    const clip: Clip = {
      id: 'clip-1',
      assetId: 'asset-1',
      trackId: 'track-1',
      start: 0,
      duration: 10,
      offset: 0,
      type: 'video',
      properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }
    };
    useProjectStore.getState().addClip(clip);

    const state = useProjectStore.getState();
    expect(state.clips['clip-1']).toEqual(clip);
    expect(state.tracks['track-1'].clips).toContain('clip-1');
  });

  it('should remove a clip', () => {
    const track: Track = { id: 'track-1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip: Clip = { id: 'clip-1', assetId: 'a1', trackId: 'track-1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    useProjectStore.getState().addTrack(track);
    useProjectStore.getState().addClip(clip);
    useProjectStore.getState().removeClip('clip-1');

    const state = useProjectStore.getState();
    expect(state.clips['clip-1']).toBeUndefined();
    expect(state.tracks['track-1'].clips).not.toContain('clip-1');
  });

  it('should move a clip within the same track', () => {
    const track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] } as Track;
    const clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } } as Clip;

    useProjectStore.getState().addTrack(track);
    useProjectStore.getState().addClip(clip);

    useProjectStore.getState().moveClip('c1', 5);

    const state = useProjectStore.getState();
    expect(state.clips['c1'].start).toBe(5);
    expect(state.clips['c1'].trackId).toBe('t1');
  });

  it('should move a clip to another track', () => {
    const t1 = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] } as Track;
    const t2 = { id: 't2', type: 'video', label: 'V2', isMuted: false, isLocked: false, clips: [] } as Track;
    const clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } } as Clip;

    const store = useProjectStore.getState();
    store.addTrack(t1);
    store.addTrack(t2);
    store.addClip(clip);

    store.moveClip('c1', 5, 't2');

    const state = useProjectStore.getState();
    expect(state.clips['c1'].start).toBe(5);
    expect(state.clips['c1'].trackId).toBe('t2');
    expect(state.tracks['t1'].clips).not.toContain('c1');
    expect(state.tracks['t2'].clips).toContain('c1');
  });
});
