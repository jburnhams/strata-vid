import { act } from '@testing-library/react';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { Asset, Clip } from '../../../src/types';

describe('useProjectStore', () => {
  beforeEach(() => {
    // Reset store
    act(() => {
      useProjectStore.setState({
        assets: [],
        timeline: [],
        selectedAssetId: null
      });
    });
  });

  it('adds and removes assets', () => {
    const asset: Asset = {
      id: '1',
      name: 'test.mp4',
      type: 'video',
      src: 'blob:url'
    };

    act(() => {
      useProjectStore.getState().addAsset(asset);
    });

    expect(useProjectStore.getState().assets).toHaveLength(1);
    expect(useProjectStore.getState().assets[0]).toEqual(asset);

    act(() => {
      useProjectStore.getState().removeAsset('1');
    });

    expect(useProjectStore.getState().assets).toHaveLength(0);
  });

  it('selects an asset', () => {
    act(() => {
      useProjectStore.getState().selectAsset('1');
    });
    expect(useProjectStore.getState().selectedAssetId).toBe('1');
  });

  it('adds and removes clips', () => {
    const clip: Clip = {
      id: 'c1',
      assetId: '1',
      start: 0,
      duration: 10
    };

    act(() => {
      useProjectStore.getState().addClip(clip);
    });

    expect(useProjectStore.getState().timeline).toHaveLength(1);

    act(() => {
      useProjectStore.getState().removeClip('c1');
    });

    expect(useProjectStore.getState().timeline).toHaveLength(0);
  });

  it('updates a clip', () => {
    const clip: Clip = {
      id: 'c1',
      assetId: '1',
      start: 0,
      duration: 10
    };

    act(() => {
      useProjectStore.getState().addClip(clip);
      useProjectStore.getState().updateClip('c1', { start: 5 });
    });

    expect(useProjectStore.getState().timeline[0].start).toBe(5);
  });

  it('removes clips when asset is removed', () => {
      const asset: Asset = { id: 'a1', name: 'v', type: 'video', src: '' };
      const clip: Clip = { id: 'c1', assetId: 'a1', start: 0, duration: 1 };

      act(() => {
          useProjectStore.getState().addAsset(asset);
          useProjectStore.getState().addClip(clip);
      });

      expect(useProjectStore.getState().timeline).toHaveLength(1);

      act(() => {
          useProjectStore.getState().removeAsset('a1');
      });

      expect(useProjectStore.getState().assets).toHaveLength(0);
      expect(useProjectStore.getState().timeline).toHaveLength(0);
  });
});
