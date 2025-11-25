import { parseGpxFile, simplifyTrack, getCoordinateAtTime } from '../../../src/utils/gpxParser';
import { GpxPoint } from '../../../src/types';

describe('gpxParser', () => {
  describe('parseGpxFile', () => {
    it('should parse a valid GPX file', async () => {
      const gpxContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="Strata-Vid-Test">
          <trk>
            <name>Test Track</name>
            <trkseg>
              <trkpt lat="45.0" lon="-75.0">
                <ele>100</ele>
                <time>2025-11-25T00:00:00Z</time>
              </trkpt>
              <trkpt lat="45.001" lon="-75.001">
                <ele>110</ele>
                <time>2025-11-25T00:00:10Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>
      `;
      const file = new File([gpxContent], 'test.gpx', { type: 'application/gpx+xml' });
      file.text = jest.fn().mockResolvedValue(gpxContent);
      const { geoJson, stats, points } = await parseGpxFile(file);
      expect(geoJson).toBeDefined();
      expect(stats).toBeDefined();
      expect(points.length).toBe(2);
    });

    it('should throw an error for an invalid GPX file', async () => {
      const file = new File(['invalid'], 'test.gpx', { type: 'application/gpx+xml' });
      file.text = jest.fn().mockResolvedValue('invalid');
      await expect(parseGpxFile(file)).rejects.toThrow();
    });

    it('should return no stats for a GPX file with no tracks', async () => {
        const gpxContent = `
            <?xml version="1.0" encoding="UTF-8"?>
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="Strata-Vid-Test">
            </gpx>
        `;
        const file = new File([gpxContent], 'test.gpx', { type: 'application/gpx+xml' });
        file.text = jest.fn().mockResolvedValue(gpxContent);
        const { stats } = await parseGpxFile(file);
        expect(stats).toBeUndefined();
    });
  });

  describe('simplifyTrack', () => {
    const straightLine: GpxPoint[] = [
        { time: 0, lat: 0, lon: 0, ele: 0 },
        { time: 1, lat: 0, lon: 1, ele: 0 },
        { time: 2, lat: 0, lon: 2, ele: 0 },
    ];

    const nearlyStraightLine: GpxPoint[] = [
        { time: 0, lat: 0, lon: 0, ele: 0 },
        { time: 1, lat: 0.00005, lon: 1, ele: 0 }, // Slight deviation
        { time: 2, lat: 0, lon: 2, ele: 0 },
    ];

    const deviatedLine: GpxPoint[] = [
        { time: 0, lat: 0, lon: 0, ele: 0 },
        { time: 1, lat: 0.1, lon: 1, ele: 0 }, // Significant deviation
        { time: 2, lat: 0, lon: 2, ele: 0 },
    ];

    it('should simplify a perfectly straight line to two points', () => {
        const simplified = simplifyTrack(straightLine, 0.0001);
        expect(simplified.length).toBe(2);
    });

    it('should NOT simplify a nearly straight line if tolerance is too low', () => {
        const simplified = simplifyTrack(nearlyStraightLine, 0.00001);
        expect(simplified.length).toBe(3);
    });

    it('SHOULD simplify a nearly straight line if tolerance is high enough', () => {
        const simplified = simplifyTrack(nearlyStraightLine, 0.001);
        expect(simplified.length).toBe(2);
    });

    it('should keep points that deviate significantly', () => {
        const simplified = simplifyTrack(deviatedLine, 0.01);
        expect(simplified.length).toBe(3);
    });
  });

  describe('getCoordinateAtTime', () => {
    const points: GpxPoint[] = [
        { time: 1000, lat: 10, lon: 10, ele: 100, dist: 0 },
        { time: 2000, lat: 20, lon: 20, ele: 200, dist: 1000 },
    ];

    it('interpolates all values correctly', () => {
        const result = getCoordinateAtTime(points, 1500);
        expect(result).not.toBeNull();
        expect(result?.lat).toBe(15);
        expect(result?.lon).toBe(15);
        expect(result?.ele).toBe(150);
        expect(result?.dist).toBe(500);
    });

    it('returns start/end point when time is out of bounds', () => {
        expect(getCoordinateAtTime(points, 500)).toEqual(points[0]);
        expect(getCoordinateAtTime(points, 2500)).toEqual(points[1]);
    });
  });
});
