
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
  });
};

describe('Store - Timeline Slice (Speed Ramping)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should update clip playback rate and adjust duration', () => {
    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    // Clip: 10s duration (source 0-10), rate 1.0
    const clip: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip);

    // Speed up 2x
    store.updateClipPlaybackRate('c1', 2);

    const state = useProjectStore.getState();
    const updatedClip = state.clips['c1'];
    expect(updatedClip.playbackRate).toBe(2);
    expect(updatedClip.duration).toBe(5); // 10s source / 2 = 5s
    expect(updatedClip.offset).toBe(0);
  });

  it('should slow down clip playback rate and adjust duration', () => {
    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip);

    // Slow down 0.5x
    store.updateClipPlaybackRate('c1', 0.5);

    const state = useProjectStore.getState();
    const updatedClip = state.clips['c1'];
    expect(updatedClip.playbackRate).toBe(0.5);
    expect(updatedClip.duration).toBe(20); // 10s source / 0.5 = 20s
  });

  it('should preserve source coverage when changing speed multiple times', () => {
    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip);

    // 1x -> 2x
    store.updateClipPlaybackRate('c1', 2);
    let c1 = useProjectStore.getState().clips['c1'];
    expect(c1.duration).toBe(5);

    // 2x -> 4x
    // Current duration 5s, rate 2. Source duration = 5*2 = 10s.
    // New rate 4. New duration = 10/4 = 2.5s.
    store.updateClipPlaybackRate('c1', 4);
    c1 = useProjectStore.getState().clips['c1'];
    expect(c1.duration).toBe(2.5);

    // 4x -> 0.5x
    // Source duration = 2.5*4 = 10s.
    // New rate 0.5. New duration = 10/0.5 = 20s.
    store.updateClipPlaybackRate('c1', 0.5);
    c1 = useProjectStore.getState().clips['c1'];
    expect(c1.duration).toBe(20);
  });
});
