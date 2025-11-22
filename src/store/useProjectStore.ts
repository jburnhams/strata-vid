import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createProjectSlice, ProjectSlice } from './slices/projectSlice';
import { createAssetsSlice, AssetsSlice } from './slices/assetsSlice';
import { createTimelineSlice, TimelineSlice } from './slices/timelineSlice';
import { createPlaybackSlice, PlaybackSlice } from './slices/playbackSlice';

export type StoreState = ProjectSlice & AssetsSlice & TimelineSlice & PlaybackSlice;

export const useProjectStore = create<StoreState>()(
  immer((...a) => ({
    ...createProjectSlice(...a),
    ...createAssetsSlice(...a),
    ...createTimelineSlice(...a),
    ...createPlaybackSlice(...a),
  }))
);
