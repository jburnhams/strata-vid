
import { AssetLoader } from '../../src/services/AssetLoader';
import { parseGpxFile, simplifyTrack } from '../../src/utils/gpxParser';
import { Input } from 'mediabunny';

// Mock dependencies
jest.mock('../../src/utils/gpxParser', () => ({
  parseGpxFile: jest.fn(),
  simplifyTrack: jest.fn(points => points), // Pass-through mock
}));
jest.mock('mediabunny');

describe('AssetLoader', () => {
  const mockFile = new File([''], 'test.mp4', { type: 'video/mp4' });
  const mockGpxFile = new File(['<gpx>...</gpx>'], 'test.gpx', { type: 'application/gpx+xml' });

  // Store original createElement to restore later if needed, though Jest restores mocks
  // automatically if configured, but manual mocks on document/window might persist.
  const originalCreateElement = document.createElement;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();

    // Mock HTMLCanvasElement.getContext for thumbnail generation
    // @ts-ignore
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
        drawImage: jest.fn(),
    }));

    // Mock HTMLCanvasElement.toBlob
    // @ts-ignore
    HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
        callback(new Blob([''], { type: 'image/jpeg' }));
    });

    // Mock document.createElement to intercept 'video'
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'video') {
            const videoMock = {
                preload: '',
                muted: false,
                playsInline: false,
                src: '',
                videoWidth: 1920,
                videoHeight: 1080,
                onloadeddata: null as any,
                onseeked: null as any,
                onerror: null as any,
                currentTime: 0,
                setAttribute: jest.fn(),
                getAttribute: jest.fn(),
            };

            // Define src setter to trigger onloadeddata
            Object.defineProperty(videoMock, 'src', {
                set(v) {
                    this._src = v;
                    // Simulate async load
                    setTimeout(() => {
                        if (this.onloadeddata) this.onloadeddata();
                    }, 0);
                },
                get() { return this._src; }
            });

            // Define currentTime setter to trigger onseeked
            Object.defineProperty(videoMock, 'currentTime', {
                set(v) {
                    this._currentTime = v;
                    // Simulate async seek
                    setTimeout(() => {
                        if (this.onseeked) this.onseeked();
                    }, 0);
                },
                get() { return this._currentTime; }
            });

            return videoMock as unknown as HTMLElement;
        } else if (tagName === 'canvas') {
             // Return a real canvas (or mocked one)
             return originalCreateElement.call(document, 'canvas');
        }
        return originalCreateElement.call(document, tagName);
    });
  });

  afterEach(() => {
      jest.restoreAllMocks();
  });

  it('should determine asset type correctly', () => {
    expect(AssetLoader.determineType(mockFile)).toBe('video');
    expect(AssetLoader.determineType(mockGpxFile)).toBe('gpx');

    const imgFile = new File([''], 'test.png', { type: 'image/png' });
    expect(AssetLoader.determineType(imgFile)).toBe('image');

    const audioFile = new File([''], 'test.mp3', { type: 'audio/mpeg' });
    expect(AssetLoader.determineType(audioFile)).toBe('audio');
  });

  it('should throw error for unsupported file type', () => {
    const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
    expect(() => AssetLoader.determineType(txtFile)).toThrow('Unsupported file type: text/plain');
  });

  it('should load a video asset with metadata using mediabunny (computeDuration)', async () => {
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
    // Thumbnail should NOT be loaded automatically anymore (lazy loading)
    expect(asset.thumbnail).toBeUndefined();
  });

  it('should load thumbnail separately via loadThumbnail', async () => {
      const thumbUrl = await AssetLoader.loadThumbnail(mockFile, 'video');
      expect(thumbUrl).toBe('blob:test');
  });

  it('should load a video asset with metadata using mediabunny (getFormat)', async () => {
    // Mock Mediabunny Input with getFormat instead of computeDuration
    const mockInput = {
      // computeDuration is undefined
      getFormat: jest.fn().mockResolvedValue({ duration: 60 }),
      getVideoTracks: jest.fn().mockResolvedValue([{
        width: 1280,
        height: 720
      }]),
      dispose: jest.fn()
    };

    (Input as unknown as jest.Mock).mockImplementation(() => mockInput);

    const asset = await AssetLoader.loadAsset(mockFile);

    expect(asset.type).toBe('video');
    expect(asset.duration).toBe(60);
    expect(asset.resolution).toEqual({ width: 1280, height: 720 });
    expect(mockInput.dispose).toHaveBeenCalled();
  });

  it('should extract creation time from metadata', async () => {
    const mockInput = {
      getFormat: jest.fn().mockResolvedValue({
          duration: 60,
          tags: { creation_time: '2023-01-01T12:00:00Z' }
      }),
      getVideoTracks: jest.fn().mockResolvedValue([]),
      dispose: jest.fn()
    };
    (Input as unknown as jest.Mock).mockImplementation(() => mockInput);

    const asset = await AssetLoader.loadAsset(mockFile);

    expect(asset.creationTime).toEqual(new Date('2023-01-01T12:00:00Z'));
    expect(asset.creationTimeSource).toBe('metadata');
  });

  it('should fallback to file.lastModified if metadata missing', async () => {
    const mockInput = {
      getFormat: jest.fn().mockResolvedValue({ duration: 60 }), // No tags
      getVideoTracks: jest.fn().mockResolvedValue([]),
      dispose: jest.fn()
    };
    (Input as unknown as jest.Mock).mockImplementation(() => mockInput);

    // Mock file with lastModified. Note: File constructor doesn't take lastModified in JSDOM usually, but let's try or use defineProperty
    const fileWithDate = new File([''], 'test.mp4', { type: 'video/mp4' });
    Object.defineProperty(fileWithDate, 'lastModified', { value: 1672531200000 });

    const asset = await AssetLoader.loadAsset(fileWithDate);

    expect(asset.creationTime).toEqual(new Date(1672531200000));
    expect(asset.creationTimeSource).toBe('file');
  });

  it('should handle mediabunny errors gracefully', async () => {
      // Mock Mediabunny Input to throw
      (Input as unknown as jest.Mock).mockImplementation(() => {
          throw new Error('Mediabunny error');
      });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const asset = await AssetLoader.loadAsset(mockFile);

      expect(asset.type).toBe('video');
      expect(asset.duration).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to extract video metadata via mediabunny', expect.any(Error));

      // Should still fallback to file time
      expect(asset.creationTimeSource).toBe('file');

      consoleSpy.mockRestore();
  });

  it('should load a GPX asset', async () => {
    (parseGpxFile as jest.Mock).mockResolvedValue({
      geoJson: {},
      stats: { time: { duration: 1000 } },
      points: [{ time: 0, lat: 0, lon: 0, ele: 0 }]
    });

    const asset = await AssetLoader.loadAsset(mockGpxFile);

    expect(asset.type).toBe('gpx');
    expect(asset.stats).toBeDefined();
    expect(parseGpxFile).toHaveBeenCalledWith(mockGpxFile);
  });

  it('should handle GPX parsing errors gracefully', async () => {
    (parseGpxFile as jest.Mock).mockRejectedValue(new Error('GPX error'));
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const asset = await AssetLoader.loadAsset(mockGpxFile);

    expect(asset.type).toBe('gpx');
    expect(asset.stats).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to parse GPX', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should revoke object URLs on cleanup', () => {
      // Use explicit global mock for safety, although setUp already did it, doing it again here ensures test isolation
      global.URL.revokeObjectURL = jest.fn();

      const asset = {
          src: 'blob:video',
          thumbnail: 'blob:thumb'
      } as any;

      AssetLoader.revokeAsset(asset);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:video');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:thumb');
  });
});
