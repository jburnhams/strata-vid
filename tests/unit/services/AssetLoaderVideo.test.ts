import { AssetLoader } from '../../../src/services/AssetLoader';
import { Input, BlobSource } from 'mediabunny';

// Mock mediabunny
jest.mock('mediabunny', () => ({
  BlobSource: jest.fn(),
  Input: jest.fn(),
  ALL_FORMATS: []
}));

describe('AssetLoader Video', () => {
  const mockInput = {
    getFormat: jest.fn(),
    computeDuration: jest.fn(),
    getVideoTracks: jest.fn(),
    dispose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Input as unknown as jest.Mock).mockImplementation(() => mockInput);
    (global.URL.createObjectURL as jest.Mock).mockReturnValue('blob:test-url');
    (global.URL.revokeObjectURL as jest.Mock).mockImplementation(() => {});
  });

  it('should determine "video" type for common video mime types', () => {
    const mp4 = new File([], 'vid.mp4', { type: 'video/mp4' });
    const mov = new File([], 'vid.mov', { type: 'video/quicktime' });
    const webm = new File([], 'vid.webm', { type: 'video/webm' });

    expect(AssetLoader.determineType(mp4)).toBe('video');
    expect(AssetLoader.determineType(mov)).toBe('video');
    expect(AssetLoader.determineType(webm)).toBe('video');
  });

  it('should load a video asset and populate metadata from mediabunny', async () => {
    const file = new File([''], 'test.mp4', { type: 'video/mp4' });

    // Mock successful metadata extraction
    mockInput.getFormat.mockResolvedValue({
      duration: 15.5,
      tags: { creation_time: '2023-05-20T10:00:00Z' }
    });
    mockInput.getVideoTracks.mockResolvedValue([{
      width: 1920,
      height: 1080,
      displayWidth: 1920,
      displayHeight: 1080
    }]);

    const asset = await AssetLoader.loadAsset(file);

    expect(asset.type).toBe('video');
    expect(asset.name).toBe('test.mp4');
    expect(asset.src).toBe('blob:test-url');
    expect(asset.duration).toBe(15.5);
    expect(asset.resolution).toEqual({ width: 1920, height: 1080 });
    expect(asset.creationTime).toEqual(new Date('2023-05-20T10:00:00Z'));
    expect(asset.creationTimeSource).toBe('metadata');

    expect(mockInput.dispose).toHaveBeenCalled();
  });

  it('should use computeDuration if getFormat returns no duration', async () => {
    const file = new File([''], 'test.mp4', { type: 'video/mp4' });

    mockInput.getFormat.mockResolvedValue({});
    mockInput.computeDuration.mockResolvedValue(20.0);
    mockInput.getVideoTracks.mockResolvedValue([]);

    const asset = await AssetLoader.loadAsset(file);

    expect(asset.duration).toBe(20.0);
  });

  it('should fallback to file creation time if metadata is missing', async () => {
    const lastModified = new Date('2022-01-01').getTime();
    const file = new File([''], 'test.mp4', { type: 'video/mp4', lastModified });

    mockInput.getFormat.mockResolvedValue({});
    mockInput.getVideoTracks.mockResolvedValue([]);

    const asset = await AssetLoader.loadAsset(file);

    expect(asset.creationTime).toEqual(new Date(lastModified));
    expect(asset.creationTimeSource).toBe('file');
  });

  it('should generate a video thumbnail (J2 Lazy Loading)', async () => {
    const file = new File([''], 'test.mp4', { type: 'video/mp4' });

    // The setup.tsx mocks document.createElement('video') to automatically trigger
    // onloadeddata and onseeked when src/currentTime are set.
    // It also mocks canvas.toBlob.

    const thumbnail = await AssetLoader.loadThumbnail(file, 'video');

    expect(thumbnail).toBe('blob:test-url');
    // Verify cleanup of the temporary video src
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should return empty string for non-video thumbnails', async () => {
     const file = new File([''], 'track.gpx', { type: 'application/gpx+xml' });
     // Though loadThumbnail takes assetType
     const thumbnail = await AssetLoader.loadThumbnail(file, 'gpx');
     expect(thumbnail).toBe('');
  });

  it('should handle video loading errors gracefully', async () => {
      const file = new File([''], 'corrupt.mp4', { type: 'video/mp4' });

      mockInput.getFormat.mockRejectedValue(new Error('Corrupt'));
      mockInput.getVideoTracks.mockResolvedValue([]);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const asset = await AssetLoader.loadAsset(file);

      expect(asset.type).toBe('video');
      // Duration undefined
      expect(asset.duration).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to extract video metadata via mediabunny', expect.any(Error));

      consoleSpy.mockRestore();
  });
});
