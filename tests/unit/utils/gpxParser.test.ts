
import { parseGpxFile, getCoordinateAtTime } from '../../../src/utils/gpxParser';
import { Asset, GpxPoint } from '../../../src/types';
import * as gpxJs from '@we-gold/gpxjs';

// Mock @we-gold/gpxjs
jest.mock('@we-gold/gpxjs', () => ({
  parseGPX: jest.fn(),
}));

describe('GPX Utils', () => {
    describe('parseGpxFile', () => {
        let file: File;

        beforeEach(() => {
            file = new File(['fake gpx content'], 'test.gpx', { type: 'application/gpx+xml' });
            // Mock file.text() since jsdom File implementation might not have it or it's not working as expected in test env
            file.text = jest.fn().mockResolvedValue('fake gpx content');
        });

        it('throws error on parse failure', async () => {
            (gpxJs.parseGPX as jest.Mock).mockReturnValue([null, new Error('Parse error')]);
            await expect(parseGpxFile(file)).rejects.toThrow('Error parsing GPX: Parse error');
        });

        it('throws error if no data found', async () => {
            (gpxJs.parseGPX as jest.Mock).mockReturnValue([null, null]);
            await expect(parseGpxFile(file)).rejects.toThrow('No GPX data found');
        });

        it('parses valid GPX file with tracks', async () => {
            const mockGpx = {
                toGeoJSON: jest.fn().mockReturnValue({ type: 'FeatureCollection', features: [] }),
                tracks: [{
                    points: [
                        { time: new Date(1000), latitude: 10, longitude: 10, elevation: 5 },
                        { time: new Date(2000), latitude: 20, longitude: 20, elevation: 15 }
                    ],
                    distance: { total: 100 },
                    elevation: { positive: 10, negative: 0, maximum: 15, minimum: 5, average: 10 },
                    duration: { startTime: new Date(1000), endTime: new Date(2000), totalDuration: 1 }
                }]
            };
            (gpxJs.parseGPX as jest.Mock).mockReturnValue([mockGpx, null]);

            const result = await parseGpxFile(file);

            expect(result.points).toHaveLength(2);
            expect(result.points[0]).toEqual({ time: 1000, lat: 10, lon: 10, ele: 5 });
            expect(result.stats).toBeDefined();
            expect(result.stats?.distance.total).toBe(100);
            expect(result.stats?.time.duration).toBe(1000);
        });

        it('handles track with no points (fallback stats)', async () => {
             const mockGpx = {
                toGeoJSON: jest.fn().mockReturnValue({ type: 'FeatureCollection', features: [] }),
                tracks: [{
                    points: [],
                    distance: { total: 0 },
                    elevation: { positive: 0, negative: 0, maximum: 0, minimum: 0, average: 0 },
                    duration: { startTime: new Date(1000), endTime: new Date(2000), totalDuration: 1 }
                }]
            };
            (gpxJs.parseGPX as jest.Mock).mockReturnValue([mockGpx, null]);

            const result = await parseGpxFile(file);
            expect(result.points).toHaveLength(0);
            expect(result.stats?.time.duration).toBe(1000);
        });

         it('handles tracks with points missing time', async () => {
            const mockGpx = {
                toGeoJSON: jest.fn().mockReturnValue({ type: 'FeatureCollection', features: [] }),
                tracks: [{
                    points: [
                        { latitude: 10, longitude: 10 }, // No time
                        { time: new Date(2000), latitude: 20, longitude: 20 }
                    ],
                    distance: { total: 100 },
                    elevation: { positive: 10, negative: 0, maximum: 15, minimum: 5, average: 10 },
                    duration: { startTime: new Date(1000), endTime: new Date(2000), totalDuration: 1 }
                }]
            };
            (gpxJs.parseGPX as jest.Mock).mockReturnValue([mockGpx, null]);

            const result = await parseGpxFile(file);
            expect(result.points).toHaveLength(1); // Only the one with time
        });
    });

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

    // Test for binary search specific branch
    it('finds point when time matches exact point in binary search', () => {
         const points2: GpxPoint[] = [
            { time: 100, lat: 1, lon: 1 },
            { time: 200, lat: 2, lon: 2 },
            { time: 300, lat: 3, lon: 3 },
            { time: 400, lat: 4, lon: 4 },
            { time: 500, lat: 5, lon: 5 },
        ];
        // Testing exact mid hit
        expect(getCoordinateAtTime(points2, 300)).toEqual({ lat: 3, lon: 3 });
        // Testing low side
        expect(getCoordinateAtTime(points2, 100)).toEqual({ lat: 1, lon: 1 });
        // Testing high side
        expect(getCoordinateAtTime(points2, 500)).toEqual({ lat: 5, lon: 5 });
    });
  });
});
