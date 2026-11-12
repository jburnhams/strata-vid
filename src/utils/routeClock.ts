/**
 * The route's clock for a map or data clip: how many seconds of the recording have passed at a
 * timeline time, so the marker, the readings and the elevation profile stay on the runner.
 *
 * The route runs at the speed of the footage under it (H5): where the top video clip plays at 2×, two
 * seconds of the run pass in each second of the timeline. Without footage, or over footage at 1×, it
 * runs at real speed. The map clip's own trim (`offset`) is seconds into its route, so a route clip
 * split in two carries on in its second half instead of starting again.
 *
 * Until 2026-11-12 the preview ignored both (it counted `t - clip.start`) while the export counted the
 * map clip's offset, so a split route restarted in the preview only, and sped-up footage left the
 * marker behind in both.
 */
import type { Clip, Track } from '../types';

/** The video clips in stacking order (track order; a later track draws on top, as in preview and export). */
export function footageOf(trackOrder: readonly string[], tracks: Record<string, Track>, clips: Record<string, Clip>): Clip[] {
  return trackOrder
    .flatMap((id) => tracks[id]?.clips ?? [])
    .map((id) => clips[id])
    .filter((clip): clip is Clip => Boolean(clip) && clip.type === 'video');
}

/** The speed of the footage seen at a time: the top video clip there, or 1 where there is none. */
export function footageRateAt(footage: readonly Clip[], time: number): number {
  for (let i = footage.length - 1; i >= 0; i--) {
    const clip = footage[i];
    if (time >= clip.start && time < clip.start + clip.duration) return clip.playbackRate || 1;
  }
  return 1;
}

/** Times between `from` and `to` where the footage's speed can change. */
function cuts(footage: readonly Clip[], from: number, to: number): number[] {
  const inside = footage.flatMap((c) => [c.start, c.start + c.duration]).filter((t) => t > from && t < to);
  return [from, ...[...new Set(inside)].sort((a, b) => a - b), to];
}

/** Seconds of the route at timeline time `time`, counted from the route clip's sync point. */
export function routeSeconds(clip: Clip, time: number, footage: readonly Clip[]): number {
  const from = clip.start;
  if (time <= from) return clip.offset + (time - from);
  const points = cuts(footage, from, time);
  let seconds = clip.offset;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    seconds += (b - a) * footageRateAt(footage, (a + b) / 2);
  }
  return seconds;
}

/** The timeline time at which the route clip reaches `seconds` of its route (for seeking from the profile). */
export function timeAtRouteSeconds(clip: Clip, seconds: number, footage: readonly Clip[]): number {
  let remaining = seconds - clip.offset;
  if (remaining <= 0) return clip.start + remaining;
  const end = Math.max(clip.start + clip.duration, ...footage.map((c) => c.start + c.duration));
  const points = cuts(footage, clip.start, end);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const rate = footageRateAt(footage, (a + b) / 2);
    if ((b - a) * rate >= remaining) return a + remaining / rate;
    remaining -= (b - a) * rate;
  }
  return points[points.length - 1] + remaining;
}
