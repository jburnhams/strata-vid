import { describe, it, expect, beforeEach } from '@jest/globals';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { Track, Clip, Keyframe } from '../../../src/types';

// Helper to reset store
const resetStore = () => {
  useProjectStore.setState({
    assets: {},
    tracks: {},
    clips: {},
    trackOrder: [],
    markers: [],
    currentTime: 0,
    isPlaying: false,
  });
};

describe('Store - Timeline Slice (Keyframes)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should add a keyframe and sort by time', () => {
    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip);

    const k1: Keyframe = { id: 'k1', time: 5, value: 1, easing: 'linear' };
    const k2: Keyframe = { id: 'k2', time: 0, value: 0, easing: 'linear' };

    store.addKeyframe('c1', 'opacity', k1);
    store.addKeyframe('c1', 'opacity', k2);

    const state = useProjectStore.getState();
    const keyframes = state.clips['c1'].keyframes?.['opacity'];
    expect(keyframes).toHaveLength(2);
    expect(keyframes?.[0].id).toBe('k2'); // Time 0
    expect(keyframes?.[1].id).toBe('k1'); // Time 5
  });

  it('should remove a keyframe', () => {
    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };
    const k1: Keyframe = { id: 'k1', time: 0, value: 0, easing: 'linear' };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip);
    store.addKeyframe('c1', 'opacity', k1);

    store.removeKeyframe('c1', 'opacity', 'k1');

    const state = useProjectStore.getState();
    expect(state.clips['c1'].keyframes?.['opacity']).toHaveLength(0);
  });

  it('should update a keyframe and resort', () => {
     const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };
    const k1: Keyframe = { id: 'k1', time: 0, value: 0, easing: 'linear' };
    const k2: Keyframe = { id: 'k2', time: 5, value: 1, easing: 'linear' };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip);
    store.addKeyframe('c1', 'opacity', k1);
    store.addKeyframe('c1', 'opacity', k2);

    // Update k1 to time 10
    store.updateKeyframe('c1', 'opacity', 'k1', { time: 10 });

    const state = useProjectStore.getState();
    const keyframes = state.clips['c1'].keyframes?.['opacity'];
    expect(keyframes).toHaveLength(2);
    expect(keyframes?.[0].id).toBe('k2'); // Time 5
    expect(keyframes?.[1].id).toBe('k1'); // Time 10
  });
});
