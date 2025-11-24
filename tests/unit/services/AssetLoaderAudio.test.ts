import { AssetLoader } from '../../../src/services/AssetLoader';
import * as audioUtils from '../../../src/utils/audioUtils';

// Mock the util to test AssetLoader in isolation
jest.mock('../../../src/utils/audioUtils');

describe('AssetLoader Audio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (!global.URL.createObjectURL || !(global.URL.createObjectURL as any).mock) {
        global.URL.createObjectURL = jest.fn();
    }
    (global.URL.createObjectURL as jest.Mock).mockReturnValue('blob:test');
  });

  it('should determine "audio" type for common audio mime types', () => {
    const mp3 = new File([], 'song.mp3', { type: 'audio/mpeg' });
    const wav = new File([], 'sound.wav', { type: 'audio/wav' });
    const aac = new File([], 'audio.aac', { type: 'audio/aac' });

    expect(AssetLoader.determineType(mp3)).toBe('audio');
    expect(AssetLoader.determineType(wav)).toBe('audio');
    expect(AssetLoader.determineType(aac)).toBe('audio');
  });

  it('should load an audio asset and populate metadata', async () => {
    const file = new File([''], 'test.mp3', { type: 'audio/mpeg' });
    const mockMetadata = {
      duration: 45.5,
      waveform: [0.1, 0.2, 0.3, 0.4]
    };

    (audioUtils.extractAudioMetadata as jest.Mock).mockResolvedValue(mockMetadata);

    const asset = await AssetLoader.loadAsset(file);

    expect(asset.type).toBe('audio');
    expect(asset.name).toBe('test.mp3');
    expect(asset.src).toBe('blob:test');
    expect(asset.duration).toBe(45.5);
    expect(asset.waveform).toEqual(mockMetadata.waveform);
    expect(audioUtils.extractAudioMetadata).toHaveBeenCalledWith(file);
  });

  it('should handle metadata extraction errors gracefully', async () => {
    const file = new File([''], 'corrupt.mp3', { type: 'audio/mpeg' });

    // Simulate error
    (audioUtils.extractAudioMetadata as jest.Mock).mockRejectedValue(new Error('Invalid format'));

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const asset = await AssetLoader.loadAsset(file);

    expect(asset.type).toBe('audio');
    expect(asset.duration).toBeUndefined();
    expect(asset.waveform).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
