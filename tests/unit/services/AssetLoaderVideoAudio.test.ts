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
    getVideoTracks: jest.fn(),
    dispose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Input as unknown as jest.Mock).mockImplementation(() => mockInput);
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

    // Mock video metadata extraction
    mockInput.getFormat.mockResolvedValue({
      duration: 10, // Matching duration
      tags: { creation_time: '2023-05-20T10:00:00Z' }
    });
    mockInput.getVideoTracks.mockResolvedValue([]);

    const asset = await AssetLoader.loadAsset(file);

    expect(extractAudioMetadata).toHaveBeenCalledWith(file);
    expect(asset.waveform).toEqual([0.1, 0.5, 0.9, 0.5, 0.1]);
  });

  it('should use audio duration if video metadata is missing duration', async () => {
    const file = new File([''], 'test.mp4', { type: 'video/mp4' });

    // Video metadata missing duration
    mockInput.getFormat.mockResolvedValue({});
    mockInput.getVideoTracks.mockResolvedValue([]);

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

      mockInput.getFormat.mockResolvedValue({ duration: 5 });
      mockInput.getVideoTracks.mockResolvedValue([]);

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
