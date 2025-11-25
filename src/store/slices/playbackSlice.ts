import { StateCreator } from 'zustand';
import { PlaybackSlice, StoreState } from '../types';

export const createPlaybackSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  PlaybackSlice
> = (set) => ({
  currentTime: 0,
  isPlaying: false,
  playbackRate: 1,
  setPlaybackState: (newState) =>
    set((state) => ({
        ...state,
        ...newState
    })),
});
