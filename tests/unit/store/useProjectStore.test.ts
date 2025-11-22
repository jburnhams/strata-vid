import { act } from '@testing-library/react';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { Asset, Track, Clip } from '../../../src/types';

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({
      assets: {},
      tracks: {},
      clips: {},
      trackOrder: [],
      selectedAssetId: null,
      settings: { width: 1920, height: 1080, fps: 30, duration: 0 },
      currentTime: 0,
      isPlaying: false,
      playbackRate: 1
    });
  });

  it('should add and remove assets', () => {
    const asset: Asset = {
      id: '1',
      name: 'test.mp4',
      type: 'video',
      src: 'blob:test'
    };

    act(() => {
      useProjectStore.getState().addAsset(asset);
    });

    expect(Object.values(useProjectStore.getState().assets)).toHaveLength(1);
    expect(useProjectStore.getState().assets['1']).toEqual(asset);

    act(() => {
      useProjectStore.getState().removeAsset('1');
    });

    expect(Object.values(useProjectStore.getState().assets)).toHaveLength(0);
  });

  it('should select an asset', () => {
      act(() => {
        useProjectStore.getState().selectAsset('1');
      });
      expect(useProjectStore.getState().selectedAssetId).toBe('1');

      act(() => {
        useProjectStore.getState().selectAsset(null);
      });
      expect(useProjectStore.getState().selectedAssetId).toBeNull();
  });

  it('should add a track', () => {
    const track: Track = {
        id: 't1',
        type: 'video',
        label: 'Video 1',
        isMuted: false,
        isLocked: false,
        clips: []
    };

    act(() => {
        useProjectStore.getState().addTrack(track);
    });

    expect(Object.values(useProjectStore.getState().tracks)).toHaveLength(1);
    expect(useProjectStore.getState().tracks['t1']).toEqual(track);
  });

  it('should add a clip and associate it with a track', () => {
      const track: Track = {
          id: 't1',
          type: 'video',
          label: 'Video 1',
          isMuted: false,
          isLocked: false,
          clips: []
      };

      const clip: Clip = {
          id: 'c1',
          assetId: 'a1',
          trackId: 't1',
          start: 0,
          duration: 10,
          offset: 0,
          type: 'video',
          properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }
      };

      act(() => {
          useProjectStore.getState().addTrack(track);
          useProjectStore.getState().addClip(clip);
      });

      expect(useProjectStore.getState().clips['c1']).toEqual(clip);
      const updatedTrack = useProjectStore.getState().tracks['t1'];
      expect(updatedTrack?.clips).toContain('c1');
  });

  it('should remove a clip', () => {
    const track: Track = {
        id: 't1',
        type: 'video',
        label: 'Video 1',
        isMuted: false,
        isLocked: false,
        clips: []
    };

    const clip: Clip = {
        id: 'c1',
        assetId: 'a1',
        trackId: 't1',
        start: 0,
        duration: 10,
        offset: 0,
        type: 'video',
        properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }
    };

    act(() => {
        useProjectStore.getState().addTrack(track);
        useProjectStore.getState().addClip(clip);
        useProjectStore.getState().removeClip('c1');
    });

    expect(useProjectStore.getState().clips['c1']).toBeUndefined();
    const updatedTrack = useProjectStore.getState().tracks['t1'];
    expect(updatedTrack?.clips).not.toContain('c1');
  });

  it('should update playback state', () => {
      act(() => {
          useProjectStore.getState().setPlaybackState({ isPlaying: true, currentTime: 10 });
      });

      expect(useProjectStore.getState().isPlaying).toBe(true);
      expect(useProjectStore.getState().currentTime).toBe(10);
  });
});
