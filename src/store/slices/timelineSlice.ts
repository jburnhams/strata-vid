import { StateCreator } from 'zustand';
import { TimelineSlice, StoreState } from '../types';

export const createTimelineSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  TimelineSlice
> = (set) => ({
  tracks: {},
  clips: {},
  trackOrder: [],
  addTrack: (track) =>
    set((state) => {
      state.tracks[track.id] = track;
      state.trackOrder.push(track.id);
    }),
  removeTrack: (id) =>
    set((state) => {
      // Remove clips associated with the track
      const track = state.tracks[id];
      if (track) {
        track.clips.forEach((clipId) => {
          delete state.clips[clipId];
        });
      }
      delete state.tracks[id];
      state.trackOrder = state.trackOrder.filter((tId) => tId !== id);
    }),
  addClip: (clip) =>
    set((state) => {
      const track = state.tracks[clip.trackId];
      if (track) {
        state.clips[clip.id] = clip;
        track.clips.push(clip.id);
      }
    }),
  removeClip: (id) =>
    set((state) => {
      const clip = state.clips[id];
      if (clip) {
        const track = state.tracks[clip.trackId];
        if (track) {
          track.clips = track.clips.filter((cId) => cId !== id);
        }
      }
      delete state.clips[id];
    }),
  moveClip: (id, newStart, newTrackId) =>
    set((state) => {
      const clip = state.clips[id];
      if (!clip) return;

      // If changing tracks
      if (newTrackId && newTrackId !== clip.trackId) {
        const oldTrack = state.tracks[clip.trackId];
        const newTrack = state.tracks[newTrackId];

        if (oldTrack && newTrack) {
          // Remove from old track
          oldTrack.clips = oldTrack.clips.filter((cId) => cId !== id);
          // Add to new track
          newTrack.clips.push(id);
          // Update clip
          clip.trackId = newTrackId;
        }
      }

      // Update start time
      clip.start = newStart;
    }),
  resizeClip: (id, newDuration, newOffset) =>
    set((state) => {
      const clip = state.clips[id];
      if (!clip) return;

      clip.duration = newDuration;
      if (newOffset !== undefined) {
        clip.offset = newOffset;
      }
    }),
  updateClipSyncOffset: (id, syncOffset) =>
    set((state) => {
      const clip = state.clips[id];
      if (clip) {
        clip.syncOffset = syncOffset;
      }
    }),
});
