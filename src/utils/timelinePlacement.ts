// Where "Add to timeline" puts a file (issue #143). Until 2026-11-12 every file went end to end on
// whichever track ended first, so music and the route landed on the video track after the clips.
//
// - Footage and images go end to end on the video track that ends first (a new "Track 1" if there
//   is none), as before.
// - Sound goes end to end on an audio track (a new "Audio" track if there is none), so it plays
//   under the footage from the start instead of after it.
// - A route goes on an overlay track (a new "Route" track if there is none), spanning the footage
//   on the timeline, as a picture-in-picture in the top-right corner: the map belongs over the run
//   it was recorded on, and a full-frame map would hide that footage. With no footage yet it runs
//   for the route's own duration, or 10 s if the file has no times.
import type { Asset, Clip, Track } from '../types';

export interface Placement {
  /** A track to add first, when no track of the right kind exists. */
  newTrack?: Track;
  clip: Clip;
}

const FULL_FRAME: Clip['properties'] = { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 };
/** The route's map as an inset: top-right, about two fifths of the frame wide, clear of the edges. */
const ROUTE_INSET: Clip['properties'] = { x: 58, y: 4, width: 38, height: 60, rotation: 0, opacity: 1, zIndex: 1 };
const DEFAULT_SECONDS = 10;

const trackKind = (asset: Asset): Track['type'] => (asset.type === 'audio' ? 'audio' : asset.type === 'gpx' ? 'overlay' : 'video');
const clipType = (asset: Asset): Clip['type'] =>
  asset.type === 'image' ? 'image' : asset.type === 'video' ? 'video' : asset.type === 'audio' ? 'audio' : 'map';

const endOf = (track: Track, clips: Record<string, Clip>) =>
  track.clips.reduce((end, id) => (clips[id] ? Math.max(end, clips[id].start + clips[id].duration) : end), 0);

/** Decides the track and span for a file added with "Add to timeline". `newId` makes ids. */
export function placeOnTimeline(
  asset: Asset,
  state: { tracks: Record<string, Track>; trackOrder: string[]; clips: Record<string, Clip> },
  newId: () => string,
): Placement {
  const kind = trackKind(asset);
  const ordered = state.trackOrder.map((id) => state.tracks[id]).filter(Boolean);
  const candidates = ordered.filter((t) => (t.type ?? 'video') === kind && !t.isLocked);

  let track = candidates.sort((a, b) => endOf(a, state.clips) - endOf(b, state.clips))[0];
  let newTrack: Track | undefined;
  if (!track) {
    const label = kind === 'audio' ? 'Audio' : kind === 'overlay' ? 'Route' : `Track ${ordered.length + 1}`;
    newTrack = { id: newId(), type: kind, label, isMuted: false, isLocked: false, volume: 1, clips: [] };
    track = newTrack;
  }

  let start = endOf(track, state.clips);
  let duration = asset.duration || DEFAULT_SECONDS;
  let properties = FULL_FRAME;

  if (asset.type === 'gpx') {
    const footage = ordered.filter((t) => (t.type ?? 'video') === 'video').flatMap((t) => t.clips.map((id) => state.clips[id])).filter(Boolean);
    if (footage.length > 0) {
      start = Math.min(...footage.map((c) => c.start));
      duration = Math.max(...footage.map((c) => c.start + c.duration)) - start;
    } else {
      start = 0;
      const routeSeconds = asset.stats?.time?.duration ? asset.stats.time.duration / 1000 : 0;
      duration = routeSeconds > 0 ? routeSeconds : DEFAULT_SECONDS;
    }
    properties = ROUTE_INSET;
  }

  return {
    newTrack,
    clip: {
      id: newId(),
      assetId: asset.id,
      trackId: track.id,
      start,
      duration,
      offset: 0,
      type: clipType(asset),
      properties: { ...properties },
      volume: 1,
    },
  };
}
