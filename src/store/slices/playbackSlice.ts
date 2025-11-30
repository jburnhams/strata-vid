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
  masterVolume: 1.0,
  setPlaybackState: (newState) =>
    set((state) => {
      if (newState.currentTime !== undefined) state.currentTime = newState.currentTime;
      if (newState.isPlaying !== undefined) state.isPlaying = newState.isPlaying;
      if (newState.playbackRate !== undefined) state.playbackRate = newState.playbackRate;
      if (newState.masterVolume !== undefined) state.masterVolume = newState.masterVolume;
    }),
});
