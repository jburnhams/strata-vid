import { StateCreator } from 'zustand';
import { Track, Clip } from '../../types';

export interface TimelineSlice {
  tracks: Track[];
  clips: Record<string, Clip>;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  addClip: (clip: Clip) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  moveClip: (clipId: string, trackId: string, newStart: number) => void;
}

export const createTimelineSlice: StateCreator<TimelineSlice, [["zustand/immer", never]], [], TimelineSlice> = (set) => ({
  tracks: [],
  clips: {},
  addTrack: (track) => set((state) => {
    state.tracks.push(track);
  }),
  removeTrack: (id) => set((state) => {
    // Remove track
    state.tracks = state.tracks.filter((t) => t.id !== id);
    // Remove clips associated with track
    // Note: This requires iterating over all clips or relying on the track's clip list.
    // For safety, we should iterate and clean up.
    // Ideally, we should use the track's clip list to remove them from the clips map.
    // But since we don't have access to the previous state easily inside a filter without 'current',
    // we will clean up the clips map.

    // However, since we are using immer, we can mutate freely.
    // Let's find clips to remove.
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
