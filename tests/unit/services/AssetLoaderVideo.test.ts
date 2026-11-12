import { AssetLoader } from '../../../src/services/AssetLoader';
import { Input, BlobSource } from 'mediabunny';

// Mock mediabunny
jest.mock('mediabunny', () => ({
  BlobSource: jest.fn(),
  Input: jest.fn(),
  ALL_FORMATS: []
}));

describe('AssetLoader Video', () => {
  // Shaped like mediabunny's Input and its tracks (the async getters), not like ffprobe's output:
  // mocks with ffprobe's names are how issue #142 went unnoticed.
  const mockInput = {
    getFormat: jest.fn(),
    computeDuration: jest.fn(),
    getMetadataTags: jest.fn(),
    getPrimaryVideoTrack: jest.fn(),
    getPrimaryAudioTrack: jest.fn(),
    dispose: jest.fn(),
  };
  const videoTrack = (over: Record<string, unknown> = {}) => ({
    getDisplayWidth: async () => 1920,
    getDisplayHeight: async () => 1080,
    getCodec: async () => 'avc',
    computePacketStats: async () => ({ packetCount: 300, averagePacketRate: 29.97, averageBitrate: 5_000_000 }),
    ...over,
  });
  const audioTrack = { getCodec: async () => 'aac', getSampleRate: async () => 48000, getNumberOfChannels: async () => 2 };

  beforeEach(() => {
    jest.clearAllMocks();
    (Input as unknown as jest.Mock).mockImplementation(() => mockInput);
    mockInput.getFormat.mockResolvedValue({ name: 'MP4' });
    mockInput.computeDuration.mockResolvedValue(0);
    mockInput.getMetadataTags.mockResolvedValue({});
    mockInput.getPrimaryVideoTrack.mockResolvedValue(null);
    mockInput.getPrimaryAudioTrack.mockResolvedValue(null);
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

    mockInput.computeDuration.mockResolvedValue(15.5);
    mockInput.getMetadataTags.mockResolvedValue({ creationTime: new Date('2023-05-20T10:00:00Z') });
    mockInput.getPrimaryVideoTrack.mockResolvedValue(videoTrack());
    mockInput.getPrimaryAudioTrack.mockResolvedValue(audioTrack);

    const asset = await AssetLoader.loadAsset(file);

    expect(asset.type).toBe('video');
    expect(asset.name).toBe('test.mp4');
    expect(asset.src).toBe('blob:test-url');
    expect(asset.duration).toBe(15.5);
    expect(asset.resolution).toEqual({ width: 1920, height: 1080 });
    expect(asset.creationTime).toEqual(new Date('2023-05-20T10:00:00Z'));
    expect(asset.creationTimeSource).toBe('metadata');

    // Verify extra metadata
    expect(asset.videoMetadata).toBeDefined();
    expect(asset.videoMetadata?.format).toBe('MP4');
    expect(asset.videoMetadata?.videoCodec).toBe('avc');
    expect(asset.videoMetadata?.frameRate).toBe(29.97);
    expect(asset.videoMetadata?.bitrate).toBe(5000000);
    expect(asset.videoMetadata?.audioCodec).toBe('aac');
    expect(asset.videoMetadata?.sampleRate).toBe(48000);
    expect(asset.videoMetadata?.channels).toBe(2);

    expect(mockInput.dispose).toHaveBeenCalled();
  });

  it('takes the tagged date when the file has no creation time', async () => {
    const file = new File([''], 'test.mp4', { type: 'video/mp4' });
    mockInput.getMetadataTags.mockResolvedValue({ creationTime: null, date: new Date('2024-02-01T08:00:00Z') });
    const asset = await AssetLoader.loadAsset(file);
    expect(asset.creationTime).toEqual(new Date('2024-02-01T08:00:00Z'));
    expect(asset.creationTimeSource).toBe('metadata');
  });

  it("ignores a date from a camera whose clock was never set, and uses the file's time", async () => {
    const lastModified = new Date('2024-03-01T09:00:00Z').getTime();
    const file = new File([''], 'test.mp4', { type: 'video/mp4', lastModified });
    mockInput.getMetadataTags.mockResolvedValue({ creationTime: new Date('1904-01-01T00:00:00Z') });
    const asset = await AssetLoader.loadAsset(file);
    expect(asset.creationTime).toEqual(new Date(lastModified));
    expect(asset.creationTimeSource).toBe('file');
  });

  it('should fallback to file creation time if metadata is missing', async () => {
    const lastModified = new Date('2022-01-01').getTime();
    const file = new File([''], 'test.mp4', { type: 'video/mp4', lastModified });

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

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const asset = await AssetLoader.loadAsset(file);

      expect(asset.type).toBe('video');
      // Duration undefined
      expect(asset.duration).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to extract video metadata via mediabunny', expect.any(Error));

      consoleSpy.mockRestore();
  });
});
