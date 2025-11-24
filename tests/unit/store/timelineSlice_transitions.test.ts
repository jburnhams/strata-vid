
import { describe, it, expect, beforeEach } from '@jest/globals';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { Track, Clip, Transition } from '../../../src/types';

// Helper to reset store
const resetStore = () => {
  useProjectStore.setState({
    assets: {},
    tracks: {},
    clips: {},
    trackOrder: [],
    currentTime: 0,
    isPlaying: false,
  });
};

describe('Store - Timeline Slice (Transitions)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should add a crossfade transition and overlap clips', () => {
    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip1: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };
    const clip2: Clip = { id: 'c2', assetId: 'a2', trackId: 't1', start: 10, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip1);
    store.addClip(clip2);

    const transition: Transition = { type: 'crossfade', duration: 1 };

    store.addTransition('c2', transition);

    const state = useProjectStore.getState();
    const c2 = state.clips['c2'];

    expect(c2.transitionIn).toEqual(transition);
    expect(c2.start).toBe(9); // 10 - 1
  });

  it('should shift subsequent clips when adding transition', () => {
    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip1: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };
    const clip2: Clip = { id: 'c2', assetId: 'a2', trackId: 't1', start: 10, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };
    const clip3: Clip = { id: 'c3', assetId: 'a3', trackId: 't1', start: 20, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip1);
    store.addClip(clip2);
    store.addClip(clip3);

    const transition: Transition = { type: 'crossfade', duration: 2 };
    store.addTransition('c2', transition);

    const state = useProjectStore.getState();

    expect(state.clips['c2'].start).toBe(8); // 10 - 2
    expect(state.clips['c3'].start).toBe(18); // 20 - 2
  });

  it('should not add transition if no previous clip exists', () => {
    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip1: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip1);

    store.addTransition('c1', { type: 'crossfade', duration: 1 });

    const state = useProjectStore.getState();
    expect(state.clips['c1'].transitionIn).toBeUndefined();
    expect(state.clips['c1'].start).toBe(0);
  });

  it('should not add transition if overlap causes collision with earlier clips', () => {
    // c1: 0-10
    // c2: 10-20
    // c3: 20-30
    // Transition c3 by 11s -> new start 9. Collides with c1 (ends 10).
    // Note: collision check ignores c2 because c2 is the previous clip which we are intentionally overlapping?
    // Wait, c3 transitions with c2. So overlap with c2 is ALLOWED.
    // But overlap with c1 is NOT.

    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const c1: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };
    const c2: Clip = { id: 'c2', assetId: 'a2', trackId: 't1', start: 10, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };
    const c3: Clip = { id: 'c3', assetId: 'a3', trackId: 't1', start: 20, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(c1);
    store.addClip(c2);
    store.addClip(c3);

    store.addTransition('c3', { type: 'crossfade', duration: 11 });

    const state = useProjectStore.getState();
    expect(state.clips['c3'].transitionIn).toBeUndefined();
    expect(state.clips['c3'].start).toBe(20);
  });
});
