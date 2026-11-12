import { AssetLoader } from '../../../src/services/AssetLoader';
import { Input } from 'mediabunny';
import { extractAudioMetadata } from '../../../src/utils/audioUtils';

// Mock mediabunny
jest.mock('mediabunny', () => ({
  BlobSource: jest.fn(),
  Input: jest.fn(),
  ALL_FORMATS: []
}));

// Mock audioUtils
jest.mock('../../../src/utils/audioUtils', () => ({
  extractAudioMetadata: jest.fn()
}));

describe('AssetLoader Video Audio Extraction', () => {
  const mockInput = {
    getFormat: jest.fn(),
    computeDuration: jest.fn(),
    getMetadataTags: jest.fn(),
    getPrimaryVideoTrack: jest.fn(),
    getPrimaryAudioTrack: jest.fn(),
    dispose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Input as unknown as jest.Mock).mockImplementation(() => mockInput);
    mockInput.getFormat.mockResolvedValue({ name: 'MP4' });
    mockInput.computeDuration.mockResolvedValue(10);
    mockInput.getMetadataTags.mockResolvedValue({});
    mockInput.getPrimaryVideoTrack.mockResolvedValue(null);
    mockInput.getPrimaryAudioTrack.mockResolvedValue(null);
    (global.URL.createObjectURL as jest.Mock).mockReturnValue('blob:test-url');
    (global.URL.revokeObjectURL as jest.Mock).mockImplementation(() => {});

    // Default mock for audio extraction
    (extractAudioMetadata as jest.Mock).mockResolvedValue({
        duration: 10,
        waveform: [0.1, 0.5, 0.9, 0.5, 0.1]
    });
  });

  it('should extract waveform data for video assets', async () => {
    const file = new File([''], 'test.mp4', { type: 'video/mp4' });


    const asset = await AssetLoader.loadAsset(file);

    expect(extractAudioMetadata).toHaveBeenCalledWith(file);
    expect(asset.waveform).toEqual([0.1, 0.5, 0.9, 0.5, 0.1]);
  });

  it('should use audio duration if video metadata is missing duration', async () => {
    const file = new File([''], 'test.mp4', { type: 'video/mp4' });

    // Video metadata missing duration
    mockInput.computeDuration.mockResolvedValue(0);

    // Audio metadata provides duration
    (extractAudioMetadata as jest.Mock).mockResolvedValue({
        duration: 12.5,
        waveform: [0.1]
    });

    const asset = await AssetLoader.loadAsset(file);

    expect(asset.duration).toBe(12.5);
  });

  it('should handle audio extraction failure gracefully', async () => {
      const file = new File([''], 'test.mp4', { type: 'video/mp4' });


      // Mock failure
      (extractAudioMetadata as jest.Mock).mockRejectedValue(new Error('Audio extraction failed'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const asset = await AssetLoader.loadAsset(file);

      expect(asset.type).toBe('video');
      expect(asset.waveform).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to extract audio from video:', expect.any(Error));

      consoleSpy.mockRestore();
  });
});
