import { describe, it, expect } from '@jest/globals';
import { calculateObjectFit } from '../../../src/utils/layoutUtils';

describe('layoutUtils', () => {
  describe('calculateObjectFit', () => {
    it('should handle contain mode when src is wider than dst', () => {
      // Src: 200x100 (2:1), Dst: 100x100 (1:1)
      // Should fit width, scale height
      // Target W=100. Scale = 0.5. H = 50.
      const result = calculateObjectFit(200, 100, 100, 100, 'contain');
      expect(result).toEqual({
        dw: 100,
        dh: 50,
        dx: -50,
        dy: -25
      });
    });

    it('should handle contain mode when src is taller than dst', () => {
      // Src: 100x200 (1:2), Dst: 100x100 (1:1)
      // Should fit height, scale width
      // Target H=100. Scale = 0.5. W = 50.
      const result = calculateObjectFit(100, 200, 100, 100, 'contain');
      expect(result).toEqual({
        dw: 50,
        dh: 100,
        dx: -25,
        dy: -50
      });
    });

    it('should handle cover mode when src is wider than dst', () => {
      // Src: 200x100 (2:1), Dst: 100x100 (1:1)
      // Should fill height, crop width
      // Target H=100. Scale = 1. W = 200.
      const result = calculateObjectFit(200, 100, 100, 100, 'cover');
      expect(result).toEqual({
        dw: 200,
        dh: 100,
        dx: -100,
        dy: -50
      });
    });

    it('should handle cover mode when src is taller than dst', () => {
      // Src: 100x200 (1:2), Dst: 100x100 (1:1)
      // Should fill width, crop height
      // Target W=100. Scale = 1. H = 200.
      const result = calculateObjectFit(100, 200, 100, 100, 'cover');
      expect(result).toEqual({
        dw: 100,
        dh: 200,
        dx: -50,
        dy: -100
      });
    });
  });
});
