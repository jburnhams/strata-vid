/**
 * A video clip's speed (H5), in the inspector. The renderers already played a clip at its
 * `playbackRate` (preview, export, waveform); until 2026-11-12 nothing set it.
 *
 * Speed keeps the same stretch of the file, so the clip gets shorter as it gets faster
 * (`updateClipPlaybackRate`). A slower speed that would run the clip into the next one on its track
 * is refused with the clip in the way named, as a move is, unless overlaps are allowed. The route
 * on a map follows the footage's speed (routeClock.ts), so the marker stays on the runner.
 *
 * Strata's `NumberField` refuses a typed value outside 0.25× to 8× and says so, rather than clamping.
 */
import React, { useState } from 'react';
import { NumberField, PropertyRow } from 'strata-react';
import { useProjectStore } from '../store/useProjectStore';
import type { Clip } from '../types';

export const MIN_SPEED = 0.25;
export const MAX_SPEED = 8;

/** The clip a slower speed would run into, or null. */
export function speedBlockedBy(clip: Clip, rate: number, clips: Record<string, Clip>, trackClips: readonly string[]): Clip | null {
  const end = clip.start + (clip.duration * (clip.playbackRate || 1)) / rate;
  return trackClips
    .map((id) => clips[id])
    .find((other) => other && other.id !== clip.id && other.start >= clip.start && other.start < end - 1e-9) ?? null;
}

export const ClipSpeedRow: React.FC<{ clip: Clip }> = ({ clip }) => {
  const [error, setError] = useState<string | undefined>();
  const rate = clip.playbackRate || 1;

  const setRate = (next: number | null) => {
    if (next === null) return;
    const state = useProjectStore.getState();
    const blocker = state.settings.allowOverlaps ? null : speedBlockedBy(clip, next, state.clips, state.tracks[clip.trackId]?.clips ?? []);
    if (blocker) {
      const name = state.assets[blocker.assetId]?.name ?? 'the next clip';
      setError(`At ${next}× the clip would run into ${name}. Move it or allow overlaps.`);
      return;
    }
    setError(undefined);
    state.updateClipPlaybackRate(clip.id, next);
  };

  return (
    <PropertyRow
      label="Speed"
      hint="The route on the map follows the footage's speed."
      error={error}
      modified={rate !== 1}
      onReset={() => setRate(1)}
    >
      <NumberField min={MIN_SPEED} max={MAX_SPEED} step={0.25} places={2} unit="×" value={rate} onChange={setRate} />
    </PropertyRow>
  );
};
