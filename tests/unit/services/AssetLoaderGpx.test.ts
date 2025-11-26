
import { AssetLoader } from '../../../src/services/AssetLoader';
import * as gpxParser from '../../../src/utils/gpxParser';
import { Asset, GpxPoint } from '../../../src/types';

// Mock gpxParser
jest.mock('../../../src/utils/gpxParser', () => ({
  ...jest.requireActual('../../../src/utils/gpxParser'), // Keep actual implementations
  parseGpxFile: jest.fn(),
  simplifyTrack: jest.fn((points: GpxPoint[]) => points.slice(0, 5)), // Simplify to 5 points
}));

const mockedGpxParser = gpxParser as jest.Mocked<typeof gpxParser>;

describe('AssetLoader - GPX Processing', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reprocessGpxAsset should re-parse and re-simplify the GPX file', async () => {
    const mockFile = new File(['<gpx></gpx>'], 'test.gpx', { type: 'application/gpx+xml' });
    const mockAsset: Asset = {
      id: 'gpx-1',
      name: 'test.gpx',
      type: 'gpx',
      src: 'blob:test',
      file: mockFile,
      gpxPoints: Array(20).fill({ time: 0, lat: 0, lon: 0 }), // Original 20 points
    };

    const mockParsedData = {
      geoJson: { type: 'FeatureCollection' as const, features: [] },
      stats: undefined,
      points: Array(100).fill({ time: 0, lat: 0, lon: 0 }), // Parsed as 100 points
    };

    mockedGpxParser.parseGpxFile.mockResolvedValue(mockParsedData);

    const newTolerance = 0.0005;
    const result = await AssetLoader.reprocessGpxAsset(mockAsset, newTolerance);

    // 1. Should call parseGpxFile with the original asset file
    expect(mockedGpxParser.parseGpxFile).toHaveBeenCalledWith(mockFile);

    // 2. Should call simplifyTrack with the newly parsed points and new tolerance
    expect(mockedGpxParser.simplifyTrack).toHaveBeenCalledWith(mockParsedData.points, newTolerance);

    // 3. Result should contain the simplified points
    expect(result.gpxPoints).toHaveLength(5); // Mocked to return 5 points
    expect(result.geoJson).toBe(mockParsedData.geoJson);
  });

  it('reprocessGpxAsset should throw if asset is not a valid GPX asset', async () => {
    const mockAsset: Asset = { id: 'vid-1', name: 'video.mp4', type: 'video', src: 'blob:test' };
    await expect(AssetLoader.reprocessGpxAsset(mockAsset, 0.0001)).rejects.toThrow(
      'Asset is not a valid GPX asset with a source file.'
    );
  });
});
