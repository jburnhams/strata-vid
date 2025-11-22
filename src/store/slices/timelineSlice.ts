import { StateCreator } from 'zustand';
import { TimelineSlice, StoreState } from '../types';

export const createTimelineSlice: StateCreator<StoreState, [["zustand/immer", never]], [], TimelineSlice> = (set) => ({
  tracks: [],
  clips: {},
  addTrack: (track) => set((state) => {
    state.tracks.push(track);
  }),
  removeTrack: (id) => set((state) => {
    // Remove track
    state.tracks = state.tracks.filter((t) => t.id !== id);
    // Remove clips associated with track
    const clipIdsToRemove = Object.values(state.clips)
        .filter(c => c.trackId === id)
        .map(c => c.id);

    clipIdsToRemove.forEach(cId => {
        delete state.clips[cId];
    });
  }),
  addClip: (clip) => set((state) => {
    state.clips[clip.id] = clip;
    const track = state.tracks.find((t) => t.id === clip.trackId);
    if (track) {
      track.clips.push(clip.id);
    }
  }),
  removeClip: (id) => set((state) => {
    const clip = state.clips[id];
    if (clip) {
      const track = state.tracks.find((t) => t.id === clip.trackId);
      if (track) {
        track.clips = track.clips.filter((cId) => cId !== id);
      }
      delete state.clips[id];
    }
  }),
  updateClip: (id, updates) => set((state) => {
    if (state.clips[id]) {
      state.clips[id] = { ...state.clips[id], ...updates };
    }
  }),
  moveClip: (clipId, trackId, newStart) => set((state) => {
    const clip = state.clips[clipId];
    if (clip) {
      // Remove from old track
      if (clip.trackId !== trackId) {
        const oldTrack = state.tracks.find((t) => t.id === clip.trackId);
        if (oldTrack) {
          oldTrack.clips = oldTrack.clips.filter((cId) => cId !== clipId);
        }
        const newTrack = state.tracks.find((t) => t.id === trackId);
        if (newTrack) {
          newTrack.clips.push(clipId);
        }
        clip.trackId = trackId;
      }
      clip.start = newStart;
    }
  }),
});
