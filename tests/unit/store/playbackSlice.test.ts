
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createPlaybackSlice } from '../../../src/store/slices/playbackSlice';
import { StoreState } from '../../../src/store/types';

describe('playbackSlice', () => {
  const useTestStore = create<StoreState>()(
    immer((set, get, store) => ({
      ...createPlaybackSlice(set, get, store),
      // Mock other slices as needed (or minimal implementations)
      assets: {},
      clips: {},
      tracks: {},
      trackOrder: [],
      settings: { duration: 100 } as any,
      ui: {} as any
    }))
  );

  beforeEach(() => {
    useTestStore.setState({
      currentTime: 0,
      isPlaying: false,
      playbackRate: 1,
    });
  });

  test('setPlaybackState updates isPlaying without resetting currentTime', () => {
    // 1. Set time
    useTestStore.getState().setPlaybackState({ currentTime: 10 });
    expect(useTestStore.getState().currentTime).toBe(10);

    // 2. Play
    useTestStore.getState().setPlaybackState({ isPlaying: true });
    expect(useTestStore.getState().isPlaying).toBe(true);
    expect(useTestStore.getState().currentTime).toBe(10);
  });

  test('setPlaybackState updates currentTime without resetting isPlaying', () => {
    // 1. Play
    useTestStore.getState().setPlaybackState({ isPlaying: true });
    expect(useTestStore.getState().isPlaying).toBe(true);

    // 2. Set time
    useTestStore.getState().setPlaybackState({ currentTime: 20 });
    expect(useTestStore.getState().currentTime).toBe(20);
    expect(useTestStore.getState().isPlaying).toBe(true);
  });

   test('setPlaybackState updates playbackRate', () => {
    useTestStore.getState().setPlaybackState({ playbackRate: 2 });
    expect(useTestStore.getState().playbackRate).toBe(2);
  });
});
