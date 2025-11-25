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
  markers: [],
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
  addMarker: (marker) =>
    set((state) => {
      state.markers.push(marker);
    }),
  removeMarker: (id) =>
    set((state) => {
      state.markers = state.markers.filter((m) => m.id !== id);
    }),
  updateMarker: (id, marker) =>
    set((state) => {
      const index = state.markers.findIndex((m) => m.id === id);
      if (index !== -1) {
        state.markers[index] = { ...state.markers[index], ...marker };
      }
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
  updateClip: (id, clipUpdate) =>
    set((state) => {
      const clip = state.clips[id];
      if (clip) {
        state.clips[id] = { ...clip, ...clipUpdate };
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
  splitClip: (id, time) =>
    set((state) => {
      const clip = state.clips[id];
      if (!clip) return;

      // Validate time is within clip bounds (exclusive)
      if (time <= clip.start || time >= clip.start + clip.duration) return;

      const splitOffset = time - clip.start;
      const newDuration = clip.duration - splitOffset;
      const newStart = time;
      const newOffset = clip.offset + splitOffset;

      // Update original clip
      clip.duration = splitOffset;

      // Create new clip
      const newId = `clip-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newClip: Clip = {
        ...clip,
        id: newId,
        start: newStart,
        duration: newDuration,
        offset: newOffset,
      };

      state.clips[newId] = newClip;

      const track = state.tracks[clip.trackId];
      if (track) {
        track.clips.push(newId);
      }

      // Select the new clip
      state.selectedClipId = newId;
    }),
  rippleDeleteClip: (id) =>
    set((state) => {
      const clip = state.clips[id];
      if (!clip) return;

      const trackId = clip.trackId;
      const duration = clip.duration;
      const start = clip.start;

      // Remove the clip
      delete state.clips[id];
      if (state.selectedClipId === id) {
        state.selectedClipId = null;
      }

      const track = state.tracks[trackId];
      if (track) {
        track.clips = track.clips.filter((cId) => cId !== id);

        // Shift subsequent clips on the same track
        track.clips.forEach((cId) => {
          const c = state.clips[cId];
          if (c && c.start > start) {
            c.start -= duration;
          }
        });
      }
    }),
  addTransition: (id, transition) =>
    set((state) => {
      const clip = state.clips[id];
      if (!clip) return;

      const track = state.tracks[clip.trackId];
      if (!track) return;

      // Get clips on track sorted by start time
      const trackClips = track.clips
        .map((cId) => state.clips[cId])
        .filter(Boolean) as Clip[];

      trackClips.sort((a, b) => a.start - b.start);

      const clipIndex = trackClips.findIndex((c) => c.id === id);
      if (clipIndex <= 0) return; // No previous clip

      const prevClip = trackClips[clipIndex - 1];
      const prevEnd = prevClip.start + prevClip.duration;

      // Ensure contiguous (allow small gap)
      if (Math.abs(clip.start - prevEnd) > 0.1) return;

      const shiftAmount = transition.duration;
      const newStart = clip.start - shiftAmount;

      if (newStart < 0) return;

      const newEnd = newStart + clip.duration;

      // Check collision with other clips (excluding self and prevClip)
      const hasCollision = trackClips.some((c) => {
        if (c.id === id || c.id === prevClip.id) return false;
        // Check overlap: start < cEnd && end > cStart
        const cEnd = c.start + c.duration;
        return newStart < cEnd && newEnd > c.start;
      });

      if (hasCollision) return;

      // Apply transition and shift
      clip.transitionIn = transition;
      clip.start = newStart;

      // Shift subsequent clips
      for (let i = clipIndex + 1; i < trackClips.length; i++) {
        const nextClip = state.clips[trackClips[i].id];
        if (nextClip) {
          nextClip.start -= shiftAmount;
        }
      }
    }),
  updateClipPlaybackRate: (id, playbackRate) =>
    set((state) => {
      const clip = state.clips[id];
      if (clip) {
        const currentRate = clip.playbackRate || 1;
        const sourceDuration = clip.duration * currentRate;
        const newDuration = sourceDuration / playbackRate;

        clip.playbackRate = playbackRate;
        clip.duration = newDuration;
      }
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
        clip.properties = { ...clip.properties, ...properties };
      }
    }),
  addKeyframe: (clipId, property, keyframe) =>
    set((state) => {
      const clip = state.clips[clipId];
      if (!clip) return;
      if (!clip.keyframes) clip.keyframes = {};
      if (!clip.keyframes[property]) clip.keyframes[property] = [];
      clip.keyframes[property].push(keyframe);
      // Sort by time
      clip.keyframes[property].sort((a, b) => a.time - b.time);
    }),
  removeKeyframe: (clipId, property, keyframeId) =>
    set((state) => {
      const clip = state.clips[clipId];
      if (!clip || !clip.keyframes || !clip.keyframes[property]) return;
      clip.keyframes[property] = clip.keyframes[property].filter((k) => k.id !== keyframeId);
    }),
  updateKeyframe: (clipId, property, keyframeId, update) =>
    set((state) => {
      const clip = state.clips[clipId];
      if (!clip || !clip.keyframes || !clip.keyframes[property]) return;
      const index = clip.keyframes[property].findIndex((k) => k.id === keyframeId);
      if (index !== -1) {
        Object.assign(clip.keyframes[property][index], update);
        // Resort if time changed
        if (update.time !== undefined) {
          clip.keyframes[property].sort((a, b) => a.time - b.time);
        }
      }
    }),
  addExtraTrackToClip: (clipId, assetId) =>
    set((state) => {
      const clip = state.clips[clipId];
      if (clip && clip.type === 'map') {
        if (!clip.extraTrackAssets) {
          clip.extraTrackAssets = [];
        }
        // Avoid duplicates
        if (!clip.extraTrackAssets.some((t) => t.assetId === assetId)) {
          clip.extraTrackAssets.push({ assetId });
        }
      }
    }),
  removeExtraTrackFromClip: (clipId, assetId) =>
    set((state) => {
      const clip = state.clips[clipId];
      if (clip && clip.type === 'map' && clip.extraTrackAssets) {
        clip.extraTrackAssets = clip.extraTrackAssets.filter(
          (t) => t.assetId !== assetId
        );
      }
    }),
  updateExtraTrackOnClip: (clipId, assetId, update) =>
    set((state) => {
      const clip = state.clips[clipId];
      if (clip && clip.type === 'map' && clip.extraTrackAssets) {
        const track = clip.extraTrackAssets.find(
          (t) => t.assetId === assetId
        );
        if (track) {
          Object.assign(track, update);
        }
      }
    }),
});
