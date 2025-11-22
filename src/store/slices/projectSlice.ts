import { StateCreator } from 'zustand';
import { ProjectSlice, StoreState } from '../types';

export const createProjectSlice: StateCreator<StoreState, [["zustand/immer", never]], [], ProjectSlice> = (set) => ({
  settings: { width: 1920, height: 1080, fps: 30, duration: 0 },
  updateSettings: (newSettings) => set((state) => {
    state.settings = { ...state.settings, ...newSettings };
  }),
});
