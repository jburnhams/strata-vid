import { StateCreator } from 'zustand';
import { ProjectSettings } from '../../types';

export interface ProjectSlice {
  settings: ProjectSettings;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
}

export const createProjectSlice: StateCreator<ProjectSlice, [["zustand/immer", never]], [], ProjectSlice> = (set) => ({
  settings: { width: 1920, height: 1080, fps: 30, duration: 0 },
  updateSettings: (newSettings) => set((state) => {
    state.settings = { ...state.settings, ...newSettings };
  }),
});
