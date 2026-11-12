import { readColour, writeColour, NO_ADJUSTMENT } from '../../../src/utils/colourFilter';

describe('colour adjustments as a CSS filter', () => {
  it('reads numbers and percentages, and 1 for what is not there', () => {
    expect(readColour('brightness(1.2) saturate(50%)')).toEqual({ brightness: 1.2, contrast: 1, saturate: 0.5 });
    expect(readColour(undefined)).toEqual(NO_ADJUSTMENT);
  });

  it('writes only what is changed, and nothing when nothing is', () => {
    expect(writeColour(undefined, { brightness: 1.1, contrast: 1, saturate: 0 })).toBe('brightness(1.1) saturate(0)');
    expect(writeColour('brightness(1.1)', NO_ADJUSTMENT)).toBeUndefined();
  });

  it('keeps other filter functions an older project had', () => {
    expect(writeColour('sepia(0.4) contrast(2)', { brightness: 1, contrast: 1.5, saturate: 1 })).toBe('contrast(1.5) sepia(0.4)');
  });
});
