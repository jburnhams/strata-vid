import { StateCreator } from 'zustand';
import { PlaybackSlice, StoreState } from '../types';

export const createPlaybackSlice: StateCreator<StoreState, [["zustand/immer", never]], [], PlaybackSlice> = (set) => ({
  currentTime: 0,
  isPlaying: false,
  playbackRate: 1,
  setPlaybackTime: (time) => set((state) => {
    state.currentTime = time;
  }),
  setIsPlaying: (isPlaying) => set((state) => {
    state.isPlaying = isPlaying;
  }),
  setPlaybackRate: (rate) => set((state) => {
    state.playbackRate = rate;
  }),
});
