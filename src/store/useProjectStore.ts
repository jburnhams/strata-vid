import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { StoreState } from './types';
import { createProjectSlice } from './slices/projectSlice';
import { createAssetsSlice } from './slices/assetsSlice';
import { createTimelineSlice } from './slices/timelineSlice';
import { createPlaybackSlice } from './slices/playbackSlice';

export const useProjectStore = create<StoreState>()(
  immer((set, get, store) => ({
    ...createProjectSlice(set, get, store),
    ...createAssetsSlice(set, get, store),
    ...createTimelineSlice(set, get, store),
    ...createPlaybackSlice(set, get, store),
  }))
);
