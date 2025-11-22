import { AssetLoader } from '../../src/services/AssetLoader';
import { parseGpxFile } from '../../src/utils/gpxParser';
import { Input } from 'mediabunny';

// Mock dependencies
jest.mock('../../src/utils/gpxParser');
jest.mock('mediabunny');

describe('AssetLoader', () => {
  const mockFile = new File([''], 'test.mp4', { type: 'video/mp4' });
  const mockGpxFile = new File(['<gpx>...</gpx>'], 'test.gpx', { type: 'application/gpx+xml' });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('should determine asset type correctly', () => {
    expect(AssetLoader.determineType(mockFile)).toBe('video');
    expect(AssetLoader.determineType(mockGpxFile)).toBe('gpx');

    const imgFile = new File([''], 'test.png', { type: 'image/png' });
    expect(AssetLoader.determineType(imgFile)).toBe('image');

    const audioFile = new File([''], 'test.mp3', { type: 'audio/mpeg' });
    expect(AssetLoader.determineType(audioFile)).toBe('audio');
  });

  it('should load a video asset with metadata using mediabunny', async () => {
    // Mock Mediabunny Input
    const mockInput = {
      computeDuration: jest.fn().mockResolvedValue(120),
      getVideoTracks: jest.fn().mockResolvedValue([{
        displayWidth: 1920,
        displayHeight: 1080
      }]),
      dispose: jest.fn()
    };

    (Input as unknown as jest.Mock).mockImplementation(() => mockInput);

    const asset = await AssetLoader.loadAsset(mockFile);

    expect(asset.type).toBe('video');
    expect(asset.duration).toBe(120);
    expect(asset.resolution).toEqual({ width: 1920, height: 1080 });
    expect(mockInput.dispose).toHaveBeenCalled();
  });

  it('should load a GPX asset', async () => {
    (parseGpxFile as jest.Mock).mockResolvedValue({
      geoJson: {},
      stats: { time: { duration: 1000 } }
    });

    const asset = await AssetLoader.loadAsset(mockGpxFile);

    expect(asset.type).toBe('gpx');
    expect(asset.stats).toBeDefined();
    expect(parseGpxFile).toHaveBeenCalledWith(mockGpxFile);
  });
});
