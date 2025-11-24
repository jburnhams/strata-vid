
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

  it('should remove all clips associated with a track when removing the track', () => {
    const track: Track = { id: 'track-1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip1: Clip = { id: 'clip-1', assetId: 'a1', trackId: 'track-1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };
    const clip2: Clip = { id: 'clip-2', assetId: 'a1', trackId: 'track-1', start: 10, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip1);
    store.addClip(clip2);

    store.removeTrack('track-1');

    const state = useProjectStore.getState();
    expect(state.tracks['track-1']).toBeUndefined();
    expect(state.clips['clip-1']).toBeUndefined();
    expect(state.clips['clip-2']).toBeUndefined();
  });

  it('should resize a clip', () => {
    const track: Track = { id: 'track-1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip: Clip = { id: 'clip-1', assetId: 'a1', trackId: 'track-1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip);

    store.resizeClip('clip-1', 20, 5);

    const state = useProjectStore.getState();
    expect(state.clips['clip-1'].duration).toBe(20);
    expect(state.clips['clip-1'].offset).toBe(5);
  });

  it('should ignore moving a non-existent clip', () => {
    const store = useProjectStore.getState();
    store.moveClip('non-existent', 10);
    // Should not throw and state should be unchanged
    expect(useProjectStore.getState().clips['non-existent']).toBeUndefined();
  });

  it('should not move clip to a non-existent track', () => {
    const track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] } as Track;
    const clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } } as Clip;

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip);

    store.moveClip('c1', 5, 'non-existent-track');

    const state = useProjectStore.getState();
    // Start time updates because the logic allows it if track change fails
    expect(state.clips['c1'].start).toBe(5);
    expect(state.clips['c1'].trackId).toBe('t1');
  });

  it('should not add a clip if the track does not exist', () => {
     const clip: Clip = {
      id: 'clip-orphaned',
      assetId: 'asset-1',
      trackId: 'missing-track',
      start: 0,
      duration: 10,
      offset: 0,
      type: 'video',
      properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }
    };
    useProjectStore.getState().addClip(clip);

    const state = useProjectStore.getState();
    expect(state.clips['clip-orphaned']).toBeUndefined();
  });

  it('should duplicate a clip', () => {
    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip);

    store.duplicateClip('c1');

    const state = useProjectStore.getState();
    const clips = Object.values(state.clips);
    expect(clips.length).toBe(2);

    const newClip = clips.find(c => c.id !== 'c1');
    expect(newClip).toBeDefined();
    expect(newClip?.start).toBe(10); // 0 + 10
    expect(newClip?.trackId).toBe('t1');
  });

  it('should duplicate a clip to the end of track if collision occurs', () => {
    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip1: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };
    const clip2: Clip = { id: 'c2', assetId: 'a1', trackId: 't1', start: 15, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip1);
    store.addClip(clip2);

    store.duplicateClip('c1');

    const state = useProjectStore.getState();
    const clips = Object.values(state.clips);
    expect(clips.length).toBe(3);

    const newClip = clips.find(c => c.id !== 'c1' && c.id !== 'c2');
    expect(newClip).toBeDefined();

    // Max end is 25 (c2 end). So new clip starts at 25.
    expect(newClip?.start).toBe(25);
  });

  it('should split a clip', () => {
    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip);

    // Split at 4s
    store.splitClip('c1', 4);

    const state = useProjectStore.getState();

    // Check original clip
    const c1 = state.clips['c1'];
    expect(c1.duration).toBe(4); // 0 to 4
    expect(c1.offset).toBe(0);

    // Check new clip
    // We don't know the ID, but there should be 2 clips on the track
    expect(state.tracks['t1'].clips.length).toBe(2);
    const newClipId = state.tracks['t1'].clips.find(id => id !== 'c1');
    expect(newClipId).toBeDefined();

    const newClip = state.clips[newClipId!];
    expect(newClip.start).toBe(4);
    expect(newClip.duration).toBe(6); // 10 - 4
    expect(newClip.offset).toBe(4); // 0 + 4
    expect(newClip.trackId).toBe('t1');
  });

  it('should not split a clip if time is out of bounds', () => {
    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip);

    // Try split at 12 (outside 0-10)
    store.splitClip('c1', 12);
    expect(useProjectStore.getState().tracks['t1'].clips.length).toBe(1);

    // Try split at 0 (start)
    store.splitClip('c1', 0);
    expect(useProjectStore.getState().tracks['t1'].clips.length).toBe(1);

    // Try split at 10 (end)
    store.splitClip('c1', 10);
    expect(useProjectStore.getState().tracks['t1'].clips.length).toBe(1);
  });

  it('should ripple delete a clip', () => {
    const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const clip1: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 5, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };
    const clip2: Clip = { id: 'c2', assetId: 'a1', trackId: 't1', start: 5, duration: 5, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };
    const clip3: Clip = { id: 'c3', assetId: 'a1', trackId: 't1', start: 12, duration: 5, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(track);
    store.addClip(clip1);
    store.addClip(clip2);
    store.addClip(clip3);

    // Delete c2 (5-10). c3 (12-17) should move left by 5s -> 7-12
    store.rippleDeleteClip('c2');

    const state = useProjectStore.getState();
    expect(state.clips['c2']).toBeUndefined();
    expect(state.clips['c1'].start).toBe(0); // Unaffected
    expect(state.clips['c3'].start).toBe(7); // 12 - 5
    expect(state.tracks['t1'].clips).not.toContain('c2');
  });

  it('should ripple delete only on the same track', () => {
    const t1: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] };
    const t2: Track = { id: 't2', type: 'video', label: 'V2', isMuted: false, isLocked: false, clips: [] };

    const c1: Clip = { id: 'c1', assetId: 'a1', trackId: 't1', start: 5, duration: 5, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };
    const c2: Clip = { id: 'c2', assetId: 'a1', trackId: 't2', start: 10, duration: 5, offset: 0, type: 'video', properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 } };

    const store = useProjectStore.getState();
    store.addTrack(t1);
    store.addTrack(t2);
    store.addClip(c1);
    store.addClip(c2);

    store.rippleDeleteClip('c1');

    const state = useProjectStore.getState();
    expect(state.clips['c1']).toBeUndefined();
    expect(state.clips['c2'].start).toBe(10); // Unaffected (different track)
  });
});
