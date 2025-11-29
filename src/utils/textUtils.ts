
/**
 * Smartly shortens a filename based on available width.
 *
 * Algorithm:
 * 1. If filename fits, return it.
 * 2. Remove extension. If fits, return it.
 * 3. Shorten logic:
 *    - If available space >= 10 chars: Start...End (Middle truncation)
 *    - If available space [5, 10) chars: Start... (Prefix + ellipsis)
 *    - If available space < 5 chars: Start (Prefix only)
 *
 * @param filename The full filename (e.g. "video.mp4")
 * @param maxWidthPx The available width in pixels
 * @param avgCharWidth Average character width in pixels (default 7 for text-xs)
 * @returns The shortened string
 */
export const smartShortenFilename = (
  filename: string,
  maxWidthPx: number,
  avgCharWidth: number = 7
): string => {
  if (!filename) return '';

  // Padding for container (e.g., px-2 is 8px * 2 = 16px)
  const PADDING_PX = 16;
  const availableWidth = Math.max(0, maxWidthPx - PADDING_PX);
  const maxChars = Math.floor(availableWidth / avgCharWidth);

  // Case 0: Very small space, can't show anything meaningful or just 1 char?
  // The requirement says "if less than 5, just display prefix without ellipsis".
  // Even if maxChars is 0, we might return empty string.
  if (maxChars <= 0) return '';

  // Case 1: Fits fully
  if (filename.length <= maxChars) {
    return filename;
  }

  // Remove extension
  const lastDotIndex = filename.lastIndexOf('.');
  // If no dot or dot is at start (hidden file), treat whole string as name
  const hasExtension = lastDotIndex > 0;
  const nameNoExt = hasExtension ? filename.substring(0, lastDotIndex) : filename;

  // Case 2: Fits without extension
  if (nameNoExt.length <= maxChars) {
    return nameNoExt;
  }

  // Case 3: Shorten logic

  // If maxChars < 5: Prefix only
  if (maxChars < 5) {
    return nameNoExt.substring(0, maxChars);
  }

  // If 5 <= maxChars < 10: Prefix + ellipsis
  // Ellipsis takes 1 char (or 3 dots = 3 chars? Standard ellipsis character '…' is 1 char usually)
  // Let's assume '...' (3 chars) for standard visual or '…' (1 char).
  // The prompt said "start and end with ellipsis". "ellipsis" usually implies '...'
  // But strictly fitting into "maxChars" with '...' takes 3 chars.
  // "once shorter than 10 chars space then just display prefix and ellipsis"
  // Let's use '...' (3 characters length cost).
  if (maxChars < 10) {
    // If maxChars is 5, we have room for 2 chars + '...'? Or just 5 chars?
    // "display prefix and ellipsis".
    // If maxChars = 5, prefix len = 2, '...' len = 3. Total 5.
    const prefixLen = Math.max(1, maxChars - 3);
    return nameNoExt.substring(0, prefixLen) + '...';
  }

  // If maxChars >= 10: Middle truncation "Start...End"
  // We use '...' as separator (length 3)
  const charsForText = maxChars - 3;
  const frontChars = Math.ceil(charsForText / 2);
  const backChars = Math.floor(charsForText / 2);

  return nameNoExt.substring(0, frontChars) + '...' + nameNoExt.substring(nameNoExt.length - backChars);
};
