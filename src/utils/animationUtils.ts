import { Keyframe } from '../types';

export function interpolateValue(
  keyframes: Keyframe[] | undefined,
  currentTime: number, // Time relative to clip start
  defaultValue: number
): number {
  if (!keyframes || keyframes.length === 0) {
    return defaultValue;
  }

  // 1. Before first keyframe
  if (currentTime < keyframes[0].time) {
    return keyframes[0].value;
  }

  // 2. After last keyframe (or exactly at the last keyframe)
  if (currentTime >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value;
  }

  // 3. Between keyframes
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];

    if (currentTime >= k1.time && currentTime < k2.time) {
      const duration = k2.time - k1.time;
      // Handle 0 duration to avoid division by zero
      if (duration === 0) return k2.value;

      const progress = (currentTime - k1.time) / duration;
      const easedProgress = applyEasing(progress, k1.easing); // Use easing of starting keyframe

      return k1.value + (k2.value - k1.value) * easedProgress;
    }
  }

  return defaultValue;
}

function applyEasing(t: number, type: Keyframe['easing']): number {
  switch (type) {
    case 'linear':
      return t;
    case 'ease-in': // Quad
      return t * t;
    case 'ease-out': // Quad
      return t * (2 - t);
    case 'ease-in-out': // Quad
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default:
      return t;
  }
}
