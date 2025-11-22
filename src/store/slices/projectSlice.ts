import { StateCreator } from 'zustand';
import { ProjectSlice, StoreState } from '../types';

export const createProjectSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  ProjectSlice
> = (set) => ({
  id: 'project-1',
  settings: {
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 0,
  },
  setSettings: (newSettings) =>
    set((state) => {
      Object.assign(state.settings, newSettings);
    }),
});
