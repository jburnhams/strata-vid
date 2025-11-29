import { smartShortenFilename } from '../../../src/utils/textUtils';

describe('smartShortenFilename', () => {
  const AVG_CHAR_WIDTH = 7;
  const PADDING = 16;

  // Helper to calculate pixel width from desired char count
  const widthForChars = (chars: number) => (chars * AVG_CHAR_WIDTH) + PADDING;

  it('returns full filename if it fits', () => {
    // "video.mp4" is 9 chars. Needs width for 9 chars.
    const width = widthForChars(10);
    expect(smartShortenFilename('video.mp4', width)).toBe('video.mp4');
  });

  it('removes extension if full filename does not fit but name without extension does', () => {
    // "video.mp4" (9 chars). "video" (5 chars).
    // Available space for 7 chars.
    const width = widthForChars(7);
    expect(smartShortenFilename('video.mp4', width)).toBe('video');
  });

  it('uses middle truncation if available space >= 10 chars', () => {
    // "myverylongvideo.mp4". No ext: "myverylongvideo" (15 chars).
    // Space for 10 chars.
    // 10 chars - 3 (...) = 7. Front 4, Back 3.
    // "myve...deo"
    const width = widthForChars(10);
    expect(smartShortenFilename('myverylongvideo.mp4', width)).toBe('myve...deo');
  });

  it('uses prefix + ellipsis if available space is between 5 and 10 chars', () => {
    // "superlongname.mp4". No ext: "superlongname".
    // Space for 7 chars. (< 10, >= 5)
    // 7 chars - 3 (...) = 4 prefix.
    // "supe..."
    const width = widthForChars(7);
    expect(smartShortenFilename('superlongname.mp4', width)).toBe('supe...');
  });

  it('uses prefix only if available space < 5 chars', () => {
    // "video.mp4". No ext: "video".
    // Space for 4 chars.
    // "vide"
    const width = widthForChars(4);
    expect(smartShortenFilename('video.mp4', width)).toBe('vide');
  });

  it('handles exact boundary for prefix only (4 chars)', () => {
    const width = widthForChars(4);
    expect(smartShortenFilename('abcdef.mp4', width)).toBe('abcd');
  });

  it('handles exact boundary for prefix+ellipsis (5 chars)', () => {
    // 5 chars. 5 - 3 = 2 prefix. "ab..."
    const width = widthForChars(5);
    expect(smartShortenFilename('abcdef.mp4', width)).toBe('ab...');
  });

  it('handles exact boundary for middle truncation (10 chars)', () => {
    // 10 chars space.
    // We need a name > 10 chars to trigger shortening.
    // "abcdefghijk.mp4" -> "abcdefghijk" (11 chars).
    // 10 chars - 3 = 7. Front 4, Back 3.
    // "abcd...ijk"
    const width = widthForChars(10);
    expect(smartShortenFilename('abcdefghijk.mp4', width)).toBe('abcd...ijk');
  });

  it('returns empty string if space is extremely small', () => {
    expect(smartShortenFilename('video.mp4', 5)).toBe(''); // Less than padding
  });

  it('handles names without extension', () => {
    // "myvideo" (7 chars). Fits in 7.
    const width = widthForChars(7);
    expect(smartShortenFilename('myvideo', width)).toBe('myvideo');

    // "myvideo" (7 chars). Space for 5. "my..."
    const widthSmall = widthForChars(5);
    expect(smartShortenFilename('myvideo', widthSmall)).toBe('my...');
  });

  it('handles hidden files (starting with dot)', () => {
    // ".config". lastIndexOf('.') is 0. hasExtension = false.
    // Treated as full name ".config".
    // If fits, return it.
    const width = widthForChars(7);
    expect(smartShortenFilename('.config', width)).toBe('.config');

    // If restricted space (5 chars): ".c..."
    const widthSmall = widthForChars(5);
    expect(smartShortenFilename('.config', widthSmall)).toBe('.c...');
  });
});
