import { getGpxPositionAtTime, lat2tile, lon2tile, tile2lat, tile2lon, getTileUrl } from '../../../src/utils/mapUtils';
import { Feature, LineString } from 'geojson';

describe('mapUtils', () => {
  describe('Coordinate conversions', () => {
    const london = { lat: 51.5074, lon: -0.1278 };
    const zoom = 10;

    it('should convert lat/lon to tile coordinates and back', () => {
        const x = lon2tile(london.lon, zoom);
        const y = lat2tile(london.lat, zoom);

        const lon = tile2lon(x, zoom);
        const lat = tile2lat(y, zoom);

        expect(lon).toBeCloseTo(london.lon, 4);
        expect(lat).toBeCloseTo(london.lat, 4);
    });

    it('should generate correct tile URL', () => {
        const url = getTileUrl(10, 20, 5);
        expect(url).toMatch(/https:\/\/[abc]\.tile\.openstreetmap\.org\/5\/10\/20\.png/);
    });
  });

  describe('getGpxPositionAtTime', () => {
    const startTime = new Date('2023-01-01T10:00:00Z').getTime();
    const midTime = new Date('2023-01-01T10:00:10Z').getTime();
    const endTime = new Date('2023-01-01T10:00:20Z').getTime();

    const feature: Feature<LineString> = {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [
                [0, 0],   // Start
                [10, 10], // Mid
                [20, 20]  // End
            ]
        },
        properties: {
            coordTimes: [
                new Date(startTime).toISOString(),
                new Date(midTime).toISOString(),
                new Date(endTime).toISOString()
            ]
        }
    };

    it('should return start point if time is 0', () => {
        const point = getGpxPositionAtTime(feature, 0);
        expect(point).toEqual([0, 0]);
    });

    it('should return end point if time exceeds duration', () => {
        const point = getGpxPositionAtTime(feature, 100);
        expect(point).toEqual([20, 20]);
    });

    it('should interpolate correctly', () => {
        // 5 seconds in (halfway between 0 and 10)
        const point = getGpxPositionAtTime(feature, 5);
        expect(point).toEqual([5, 5]);
    });

    it('should handle exact points', () => {
        const point = getGpxPositionAtTime(feature, 10);
        expect(point).toEqual([10, 10]);
    });

    it('should return null for non-LineString', () => {
        const point = getGpxPositionAtTime({ ...feature, geometry: { type: 'Point', coordinates: [0,0] } as any }, 0);
        expect(point).toBeNull();
    });

    it('should fallback to start if no times', () => {
        const noTimesFeature = { ...feature, properties: {} };
        const point = getGpxPositionAtTime(noTimesFeature, 10);
        expect(point).toEqual([0, 0]);
    });
  });
});
