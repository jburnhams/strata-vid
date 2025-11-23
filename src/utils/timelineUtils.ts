import { Clip } from '../types';

/**
 * Checks if a clip with the given time range overlaps with any other clips on the track.
 */
export const checkCollision = (
  start: number,
  duration: number,
  trackClips: Clip[],
  excludeClipId?: string
): boolean => {
  const end = start + duration;
  const buffer = 0.0001; // Small buffer to avoid floating point precision issues at edges

  return trackClips.some((clip) => {
    if (clip.id === excludeClipId) return false;

    const clipEnd = clip.start + clip.duration;

    // Check overlap
    // A starts before B ends AND A ends after B starts
    return start < clipEnd - buffer && end > clip.start + buffer;
  });
};

/**
 * Generates a list of time points to snap to (clip edges, playhead, etc.)
 */
export const getSnapPoints = (
  clips: Record<string, Clip>,
  currentTime: number,
  includeStart: boolean = true
): number[] => {
  const points = new Set<number>();

  if (includeStart) points.add(0);
  points.add(currentTime);

  Object.values(clips).forEach((clip) => {
    points.add(clip.start);
    points.add(clip.start + clip.duration);
  });

  return Array.from(points).sort((a, b) => a - b);
};

/**
 * Finds the nearest snap point within a given tolerance (in seconds).
 */
export const findNearestSnapPoint = (
  time: number,
  snapPoints: number[],
  tolerance: number
): number | null => {
  let nearest = null;
  let minDiff = tolerance;

  for (const point of snapPoints) {
    const diff = Math.abs(point - time);
    if (diff <= minDiff) {
      minDiff = diff;
      nearest = point;
    }
  }

  return nearest;
};

/**
 * Finds the nearest valid start time for a clip on a specific track.
 * Used when a drop results in a collision.
 * Returns null if no valid spot is found within tolerance.
 */
export const findNearestValidTime = (
  targetStart: number,
  duration: number,
  trackClips: Clip[],
  tolerance: number,
  excludeClipId?: string
): number | null => {
  // If the target itself is valid, return it (though usually this function is called after collision)
  if (!checkCollision(targetStart, duration, trackClips, excludeClipId)) {
    return targetStart;
  }

  // Potential candidates: 0, clip ends, clip starts - duration
  const candidates = new Set<number>();
  candidates.add(0);

  trackClips.forEach((clip) => {
    if (clip.id === excludeClipId) return;
    candidates.add(clip.start + clip.duration); // Snap to end of existing clip
    candidates.add(clip.start - duration); // Snap to start of existing clip (placing current clip before it)
  });

  // Filter candidates to find those that are valid and within tolerance
  let bestCandidate = null;
  let minDiff = tolerance;

  candidates.forEach((candidate) => {
    // Determine if candidate is valid
    if (candidate >= 0) {
       if (!checkCollision(candidate, duration, trackClips, excludeClipId)) {
           const diff = Math.abs(candidate - targetStart);
           if (diff <= minDiff) {
               minDiff = diff;
               bestCandidate = candidate;
           }
       }
    }
  });

  return bestCandidate;
};
