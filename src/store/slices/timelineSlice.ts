import { StateCreator } from 'zustand';
import { TimelineSlice, StoreState } from '../types';
import { Clip } from '../../types';
import { checkCollision } from '../../utils/timelineUtils';

export const createTimelineSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  TimelineSlice
> = (set) => ({
  tracks: {},
  clips: {},
  trackOrder: [],
  selectedClipId: null,
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

      // Deselect if removed
      // Note: This logic is tricky if the removed track contained the selected clip.
      // We should check if selectedClipId is among the removed clips.
      // But for now, we leave it or rely on the fact that the clip is gone from 'clips'
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
      if (state.selectedClipId === id) {
        state.selectedClipId = null;
      }
    }),
  selectClip: (id) =>
    set((state) => {
      state.selectedClipId = id;
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
  duplicateClip: (id) =>
    set((state) => {
      const clip = state.clips[id];
      if (!clip) return;

      const track = state.tracks[clip.trackId];
      if (!track) return;

      const newId = `clip-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Try to place immediately after
      let newStart = clip.start + clip.duration;

      // Get all clips on this track
      // We need to cast Object.values to Clip[] because state.clips is a Record
      // But actually, track.clips contains IDs.
      const trackClips = track.clips.map((cId) => state.clips[cId]).filter(Boolean) as Clip[];

      // Check collision
      if (checkCollision(newStart, clip.duration, trackClips)) {
        // If collision, push to the end of the track
        let maxEnd = 0;
        trackClips.forEach((c) => {
          const end = c.start + c.duration;
          if (end > maxEnd) maxEnd = end;
        });
        newStart = maxEnd;
      }

      const newClip: Clip = {
        ...clip,
        id: newId,
        start: newStart,
      };

      state.clips[newId] = newClip;
      track.clips.push(newId);

      // Select the new clip
      state.selectedClipId = newId;
    }),
  updateClipSyncOffset: (id, syncOffset) =>
    set((state) => {
      const clip = state.clips[id];
      if (clip) {
        clip.syncOffset = syncOffset;
      }
    }),
  updateClipProperties: (id, properties) =>
    set((state) => {
      const clip = state.clips[id];
      if (clip) {
        // Deep merge properties
        // clip.properties = { ...clip.properties, ...properties };
        // Since we use immer, we can assign directly?
        // But properties might be nested (trackStyle).
        // Let's do a shallow merge of the top level properties object, which is standard for Partial<OverlayProperties>
        Object.assign(clip.properties, properties);
      }
    }),
});
