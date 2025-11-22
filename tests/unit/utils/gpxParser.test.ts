import { parseGpxFile } from '../../../src/utils/gpxParser';
import { parseGPX } from '@we-gold/gpxjs';

jest.mock('@we-gold/gpxjs');

describe('gpxParser', () => {
  it('parses a valid GPX file', async () => {
    const mockFile = new File(['<xml>...'], 'test.gpx', { type: 'application/gpx+xml' });
    Object.defineProperty(mockFile, 'text', {
        value: jest.fn().mockResolvedValue('<xml>...')
    });

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
    expect(result.stats?.elevation.gain).toBe(100);
    // Duration should be 1 hour in ms
    expect(result.stats?.time.duration).toBe(3600000);
  });

  it('handles parsing error', async () => {
    const mockFile = new File(['invalid'], 'test.gpx');
    Object.defineProperty(mockFile, 'text', {
        value: jest.fn().mockResolvedValue('invalid')
    });

    (parseGPX as jest.Mock).mockReturnValue([null, new Error('Parse error')]);

    await expect(parseGpxFile(mockFile)).rejects.toThrow('Error parsing GPX: Parse error');
  });
});
