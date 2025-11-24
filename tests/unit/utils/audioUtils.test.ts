import { extractAudioMetadata } from '../../../src/utils/audioUtils';

describe('audioUtils', () => {
  let originalAudioContext: any;
  let mockDecodeAudioData: jest.Mock;
  let mockClose: jest.Mock;

  beforeAll(() => {
    originalAudioContext = window.AudioContext;
  });

  afterAll(() => {
    // @ts-ignore
    window.AudioContext = originalAudioContext;
  });

  beforeEach(() => {
    mockDecodeAudioData = jest.fn();
    mockClose = jest.fn().mockResolvedValue(undefined);

    // Mock AudioContext implementation
    const MockAudioContext = jest.fn().mockImplementation(() => ({
      decodeAudioData: mockDecodeAudioData,
      close: mockClose,
      state: 'running',
    }));

    // @ts-ignore
    window.AudioContext = MockAudioContext;
    // @ts-ignore
    window.webkitAudioContext = MockAudioContext;
  });

  it('should extract duration and waveform from a valid audio file', async () => {
    const file = new File(['dummy data'], 'test.mp3', { type: 'audio/mpeg' });

    // Mock FileReader behavior
    const originalFileReader = window.FileReader;
    // @ts-ignore
    window.FileReader = class {
      readAsArrayBuffer() {
        // @ts-ignore
        this.onload({ target: { result: new ArrayBuffer(8) } });
      }
    };

    // Mock decodeAudioData result
    const mockAudioBuffer = {
      duration: 10,
      length: 1000,
      numberOfChannels: 1,
      sampleRate: 44100,
      getChannelData: jest.fn().mockReturnValue(new Float32Array(1000).fill(0.5)), // Flat line at 0.5
    };
    mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

    const metadata = await extractAudioMetadata(file);

    expect(metadata.duration).toBe(10);
    expect(metadata.waveform).toHaveLength(100); // We requested 100 samples in the impl
    // Since input is flat 0.5, all peaks should be 0.5 (normalized to 1.0 if max is 0.5)
    // Wait, normalization: max is 0.5. val / globalMax => 0.5 / 0.5 = 1.
    expect(metadata.waveform[0]).toBeCloseTo(1);

    // Restore FileReader
    window.FileReader = originalFileReader;
  });

  it('should handle file reading errors', async () => {
    const file = new File([''], 'error.mp3', { type: 'audio/mpeg' });

    const originalFileReader = window.FileReader;
    // @ts-ignore
    window.FileReader = class {
      readAsArrayBuffer() {
        // @ts-ignore
        this.onerror();
      }
      // @ts-ignore
      error = { message: 'Read failed' };
    };

    await expect(extractAudioMetadata(file)).rejects.toThrow('FileReader error: Read failed');

    window.FileReader = originalFileReader;
  });

  it('should throw if AudioContext is not supported', async () => {
      // @ts-ignore
      window.AudioContext = undefined;
      // @ts-ignore
      window.webkitAudioContext = undefined;

      const file = new File([''], 'test.mp3', { type: 'audio/mpeg' });

      const originalFileReader = window.FileReader;
      // @ts-ignore
      window.FileReader = class {
        readAsArrayBuffer() {
          // @ts-ignore
          this.onload({ target: { result: new ArrayBuffer(8) } });
        }
      };

      await expect(extractAudioMetadata(file)).rejects.toThrow('Web Audio API is not supported');

      window.FileReader = originalFileReader;
  });
});
