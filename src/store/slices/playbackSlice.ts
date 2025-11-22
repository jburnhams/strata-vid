import { StateCreator } from 'zustand';

export interface PlaybackSlice {
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  setPlaybackTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackRate: (rate: number) => void;
}

export const createPlaybackSlice: StateCreator<PlaybackSlice, [["zustand/immer", never]], [], PlaybackSlice> = (set) => ({
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
