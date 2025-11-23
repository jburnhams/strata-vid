import { parseGpxFile } from '../../../src/utils/gpxParser';
import { parseGPX } from '@we-gold/gpxjs';

jest.mock('@we-gold/gpxjs');

describe('gpxParser', () => {
  const mockFile = new File(['<xml>...'], 'test.gpx', { type: 'application/gpx+xml' });

  beforeEach(() => {
    Object.defineProperty(mockFile, 'text', {
        value: jest.fn().mockResolvedValue('<xml>...'),
        configurable: true
    });
  });

  it('parses a valid GPX file with points', async () => {
    const startTime = new Date('2023-01-01T10:00:00Z');
    const endTime = new Date('2023-01-01T11:00:00Z');

    const mockParsedGpx = {
        toGeoJSON: jest.fn().mockReturnValue({ type: 'FeatureCollection', features: [] }),
        tracks: [{
            distance: { total: 1000 },
            elevation: { positive: 100, negative: 50, maximum: 200, minimum: 0, average: 100 },
            duration: { startTime: startTime, endTime: endTime, totalDuration: 3600 },
            points: [
                { time: startTime },
                { time: endTime }
            ]
        }]
    };

    (parseGPX as jest.Mock).mockReturnValue([mockParsedGpx, null]);

    const result = await parseGpxFile(mockFile);

    expect(result.geoJson).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(result.stats?.distance.total).toBe(1000);
    // Duration calculated from points
    expect(result.stats?.time.duration).toBe(3600000);
  });

  it('parses a GPX file with tracks but no points (fallback stats)', async () => {
    const startTime = new Date('2023-01-01T10:00:00Z');
    const endTime = new Date('2023-01-01T11:00:00Z');

    const mockParsedGpx = {
        toGeoJSON: jest.fn().mockReturnValue({ type: 'FeatureCollection', features: [] }),
        tracks: [{
            distance: { total: 1000 },
            elevation: { positive: 100, negative: 50, maximum: 200, minimum: 0, average: 100 },
            duration: { startTime: startTime, endTime: endTime, totalDuration: 3600 },
            points: [] // Empty points
        }]
    };

    (parseGPX as jest.Mock).mockReturnValue([mockParsedGpx, null]);

    const result = await parseGpxFile(mockFile);

    expect(result.stats).toBeDefined();
    // Duration should come from track.duration.totalDuration (which is in seconds, converted to ms)
    expect(result.stats?.time.duration).toBe(3600000);
    expect(result.stats?.time.start).toEqual(startTime);
    expect(result.stats?.time.end).toEqual(endTime);
  });

  it('handles parsing error', async () => {
    (parseGPX as jest.Mock).mockReturnValue([null, new Error('Parse error')]);
    await expect(parseGpxFile(mockFile)).rejects.toThrow('Error parsing GPX: Parse error');
  });

  it('handles no GPX data found (null result without error)', async () => {
    (parseGPX as jest.Mock).mockReturnValue([null, null]);
    await expect(parseGpxFile(mockFile)).rejects.toThrow('No GPX data found');
  });
});
