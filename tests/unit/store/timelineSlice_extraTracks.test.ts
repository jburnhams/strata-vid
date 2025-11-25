
import { describe, it, expect, beforeEach } from '@jest/globals';
import { act } from '@testing-library/react';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { Track, Clip } from '../../../src/types';

// Helper to reset store to a clean state before each test
const resetStore = () => {
  const initialState = {
    assets: {},
    tracks: {},
    clips: {},
    trackOrder: [],
    markers: [],
    selectedClipId: null,
    project: {
      id: 'test-project',
      settings: { width: 1920, height: 1080, fps: 30, duration: 60, previewQuality: 'medium', snapToGrid: true, allowOverlaps: false, simplificationTolerance: 0.0001 },
    },
    playback: {
      currentTime: 0,
      isPlaying: false,
      playbackRate: 1,
    },
    ui: {
      isLoading: false,
      loadingMessage: null,
      toasts: [],
    },
  };

  act(() => {
    useProjectStore.setState(initialState);
  });
};


describe('Store - Timeline Slice - Extra Tracks', () => {
  let mapClip: Clip;
  let track: Track;

  beforeEach(() => {
    act(() => {
      useProjectStore.setState({
        assets: {},
        tracks: {},
        clips: {},
        trackOrder: [],
        markers: [],
        selectedClipId: null,
      });
    });

    track = {
      id: 'track-1',
      type: 'video',
      label: 'Video 1',
      isMuted: false,
      isLocked: false,
      clips: [],
    };

    mapClip = {
      id: 'map-clip-1',
      assetId: 'gpx-asset-1',
      trackId: track.id,
      start: 0,
      duration: 10,
      offset: 0,
      type: 'map',
      properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
      extraTrackAssets: [],
    };

    // Setup initial state
    act(() => {
      useProjectStore.getState().addTrack(track);
      useProjectStore.getState().addClip(mapClip);
    });
  });

  it('should add an extra track to a map clip', () => {
    useProjectStore.getState().addExtraTrackToClip(mapClip.id, 'gpx-asset-2');

    const state = useProjectStore.getState();
    const clip = state.clips[mapClip.id];

    expect(clip.extraTrackAssets).toBeDefined();
    expect(clip.extraTrackAssets?.length).toBe(1);
    expect(clip.extraTrackAssets?.[0].assetId).toBe('gpx-asset-2');
  });

  it('should not add a duplicate extra track', () => {
    useProjectStore.getState().addExtraTrackToClip(mapClip.id, 'gpx-asset-2');
    useProjectStore.getState().addExtraTrackToClip(mapClip.id, 'gpx-asset-2'); // Add again

    const clip = useProjectStore.getState().clips[mapClip.id];
    expect(clip.extraTrackAssets?.length).toBe(1);
  });

  it('should remove an extra track from a map clip', () => {
    useProjectStore.getState().addExtraTrackToClip(mapClip.id, 'gpx-asset-2');
    useProjectStore.getState().removeExtraTrackFromClip(mapClip.id, 'gpx-asset-2');

    const clip = useProjectStore.getState().clips[mapClip.id];
    expect(clip.extraTrackAssets?.length).toBe(0);
  });

  it('should do nothing when removing a non-existent extra track', () => {
    useProjectStore.getState().addExtraTrackToClip(mapClip.id, 'gpx-asset-2');
    useProjectStore.getState().removeExtraTrackFromClip(mapClip.id, 'non-existent-asset');

    const clip = useProjectStore.getState().clips[mapClip.id];
    expect(clip.extraTrackAssets?.length).toBe(1);
  });

  it('should update an extra track on a map clip', () => {
    useProjectStore.getState().addExtraTrackToClip(mapClip.id, 'gpx-asset-2');
    useProjectStore.getState().updateExtraTrackOnClip(mapClip.id, 'gpx-asset-2', {
      trackStyle: { color: '#ff0000', weight: 5, opacity: 1 },
      syncOffset: 1000,
    });

    const clip = useProjectStore.getState().clips[mapClip.id];
    const extraTrack = clip.extraTrackAssets?.[0];

    expect(extraTrack).toBeDefined();
    expect(extraTrack?.trackStyle?.color).toBe('#ff0000');
    expect(extraTrack?.syncOffset).toBe(1000);
  });

  it('should not throw when updating a non-existent extra track', () => {
    const action = () => useProjectStore.getState().updateExtraTrackOnClip(mapClip.id, 'non-existent', { syncOffset: 500 });
    expect(action).not.toThrow();
  });

  it('should ignore actions on non-map clips', () => {
    const { extraTrackAssets, ...baseClip } = mapClip;
    const videoClip: Clip = { ...baseClip, id: 'video-clip-1', type: 'video' };

    act(() => {
      useProjectStore.getState().addClip(videoClip);
    });
    act(() => useProjectStore.getState().addExtraTrackToClip('video-clip-1', 'gpx-asset-2'));
    const updatedClip = useProjectStore.getState().clips['video-clip-1'];
    expect(updatedClip.extraTrackAssets).toBeUndefined();
  });
});
