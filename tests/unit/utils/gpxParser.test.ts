
import { parseGpxFile, getCoordinateAtTime } from '../../../src/utils/gpxParser';
import { Asset, GpxPoint } from '../../../src/types';

// Mock @we-gold/gpxjs
jest.mock('@we-gold/gpxjs', () => ({
  parseGPX: jest.fn(),
}));

// We'll mock the internal implementation details in the actual test if needed
// but since we are testing logic we add to the parser, we might not need to mock parseGPX heavily
// if we extract the logic to a pure function.

// Actually, `getCoordinateAtTime` should be a pure function.
// Let's assume we implement it in gpxParser.ts

describe('GPX Utils', () => {
  describe('getCoordinateAtTime', () => {
    const points: GpxPoint[] = [
      { time: 1000, lat: 10, lon: 10 },
      { time: 2000, lat: 20, lon: 20 },
      { time: 3000, lat: 30, lon: 30 },
    ];

    it('returns the exact point if time matches', () => {
      const result = getCoordinateAtTime(points, 2000);
      expect(result).toEqual({ lat: 20, lon: 20 });
    });

    it('interpolates between points', () => {
      const result = getCoordinateAtTime(points, 1500);
      expect(result).toEqual({ lat: 15, lon: 15 });
    });

    it('interpolates closer to the correct point', () => {
      const result = getCoordinateAtTime(points, 1250);
      expect(result).toEqual({ lat: 12.5, lon: 12.5 });
    });

    it('returns the first point if time is before start', () => {
      const result = getCoordinateAtTime(points, 500);
      expect(result).toEqual({ lat: 10, lon: 10 });
    });

    it('returns the last point if time is after end', () => {
      const result = getCoordinateAtTime(points, 3500);
      expect(result).toEqual({ lat: 30, lon: 30 });
    });

    it('handles single point array', () => {
        const singlePoint = [{ time: 1000, lat: 10, lon: 10 }];
        const result = getCoordinateAtTime(singlePoint, 2000);
        expect(result).toEqual({ lat: 10, lon: 10 });
    });

    it('returns null for empty array', () => {
        const result = getCoordinateAtTime([], 2000);
        expect(result).toBeNull();
    });
  });
});
