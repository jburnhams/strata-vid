import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createProjectSlice } from './slices/projectSlice';
import { createAssetsSlice } from './slices/assetsSlice';
import { createTimelineSlice } from './slices/timelineSlice';
import { createPlaybackSlice } from './slices/playbackSlice';
import { StoreState } from './types';

export const useProjectStore = create<StoreState>()(
  immer((...a) => ({
    ...createProjectSlice(...a),
    ...createAssetsSlice(...a),
    ...createTimelineSlice(...a),
    ...createPlaybackSlice(...a),
  }))
);
