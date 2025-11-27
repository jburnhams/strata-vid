
/**
 * Calculates the dimensions and offset for an object to fit within a destination rectangle
 * using 'contain' or 'cover' logic.
 * Assumes the destination context origin is at the center of the destination rectangle.
 */
export function calculateObjectFit(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  mode: 'contain' | 'cover'
): { dw: number; dh: number; dx: number; dy: number } {
  const srcRatio = srcW / srcH;
  const dstRatio = dstW / dstH;
  let dw = dstW;
  let dh = dstH;

  if (mode === 'contain') {
    if (srcRatio > dstRatio) {
      dh = dstW / srcRatio;
    } else {
      dw = dstH * srcRatio;
    }
  } else {
    // cover
    if (srcRatio > dstRatio) {
      dw = dstH * srcRatio;
    } else {
      dh = dstW / srcRatio;
    }
  }

  // Centered
  return { dw, dh, dx: -dw / 2, dy: -dh / 2 };
}
