import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Compositor } from '../../../src/services/Compositor';
import { Asset, Clip, ProjectSettings, Track } from '../../../src/types';
import * as mapUtils from '../../../src/utils/mapUtils';

// Mock dependencies
jest.mock('../../../src/utils/mapUtils', () => ({
  getGpxPositionAtTime: jest.fn(),
  lon2tile: jest.fn(),
  lat2tile: jest.fn(),
  getTileUrl: jest.fn(),
  TILE_SIZE: 256
}));

describe('Compositor', () => {
  let compositor: Compositor;
  let mockCtx: any;

  // Mock global Image for tile loading and asset loading
  const originalImage = global.Image;

  beforeEach(() => {
    // Mock Image to fire onload immediately (synchronous)
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      _src: string = '';
      width: number = 100;
      height: number = 100;

      set src(val: string) {
        this._src = val;
        // Immediate callback to avoid timeouts
        if (this._src.includes('error')) {
            if (this.onerror) this.onerror();
        } else {
            if (this.onload) this.onload();
        }
      }
      get src() { return this._src; }
    } as any;

    compositor = new Compositor();

    mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      beginPath: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      drawImage: jest.fn(),
      measureText: jest.fn((text: string) => ({ width: text.length * 10 })), // Simple mock
      fillText: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      canvas: { width: 1920, height: 1080 },
      globalAlpha: 1,
      filter: 'none',
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    };
  });

  afterEach(() => {
    global.Image = originalImage;
    compositor.cleanup();
  });

  describe('initialize', () => {
    it('should load video and image assets', async () => {
      const assets: Asset[] = [
        { id: 'v1', type: 'video', src: 'video.mp4', name: 'Video' },
        { id: 'i1', type: 'image', src: 'image.png', name: 'Image' },
        { id: 'i2', type: 'image', src: 'error.png', name: 'Error Image' }, // Test error case
      ];

      // Mock document.createElement for video
      const mockVideo = {
        load: jest.fn(),
        src: '',
        remove: jest.fn(),
      };
      const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'video') return mockVideo as any;
        return document.createElement(tag);
      });

      await compositor.initialize(assets);

      // Verify video loaded
      expect(mockVideo.load).toHaveBeenCalled();
      expect(mockVideo.src).toBe('video.mp4');

      createElementSpy.mockRestore();
    });
  });

  describe('renderFrame', () => {
    const projectSettings: ProjectSettings = { width: 1000, height: 1000, fps: 30 };

    it('should clear canvas and draw nothing if no tracks', async () => {
      await compositor.renderFrame(mockCtx, 0, {
        tracks: [],
        clips: {},
        assets: {},
        settings: projectSettings
      });

      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 1000, 1000);
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 1000, 1000);
    });

    it('should draw video clip', async () => {
        const asset: Asset = { id: 'v1', type: 'video', src: 'video.mp4', name: 'Video' };
        const clip: Clip = {
            id: 'c1',
            assetId: 'v1',
            trackId: 't1',
            start: 0,
            duration: 10,
            offset: 0,
            type: 'video',
            properties: { x: 50, y: 50, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }
        };

        // Initialize to populate video pool
        const mockVideo = {
            load: jest.fn(),
            src: '',
            remove: jest.fn(),
            currentTime: 0,
            videoWidth: 1920,
            videoHeight: 1080,
            addEventListener: jest.fn((event, cb: any) => {
                if (event === 'seeked') cb();
            }),
            removeEventListener: jest.fn(),
        };
        const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockVideo as any);

        await compositor.initialize([asset]);

        // Render
        await compositor.renderFrame(mockCtx, 5, {
            tracks: [{ id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: ['c1'] } as Track],
            clips: { 'c1': clip },
            assets: { 'v1': asset },
            settings: projectSettings
        });

        // Verify seek
        expect(mockVideo.currentTime).toBe(5);
        expect(mockCtx.drawImage).toHaveBeenCalledWith(mockVideo, expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));

        createElementSpy.mockRestore();
    });

    it('should skip seeking if time is close enough', async () => {
        const asset: Asset = { id: 'v1', type: 'video', src: 'video.mp4', name: 'Video' };
        const clip: Clip = {
            id: 'c1',
            assetId: 'v1',
            trackId: 't1',
            start: 0,
            duration: 10,
            offset: 0,
            type: 'video',
            properties: { x: 50, y: 50, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }
        };

        const mockVideo = {
            load: jest.fn(),
            src: '',
            remove: jest.fn(),
            currentTime: 5.0001, // Close to 5
            videoWidth: 1920,
            videoHeight: 1080,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        };
        const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockVideo as any);

        await compositor.initialize([asset]);

        // Reset spy to check calls during render
        jest.clearAllMocks();

        await compositor.renderFrame(mockCtx, 5, {
            tracks: [{ id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: ['c1'] } as Track],
            clips: { 'c1': clip },
            assets: { 'v1': asset },
            settings: projectSettings
        });

        expect(mockVideo.addEventListener).not.toHaveBeenCalledWith('seeked', expect.any(Function), expect.any(Object));

        createElementSpy.mockRestore();
    });

    it('should draw image clip', async () => {
        const asset: Asset = { id: 'i1', type: 'image', src: 'image.png', name: 'Image' };
        const clip: Clip = {
            id: 'c1',
            assetId: 'i1',
            trackId: 't1',
            start: 0,
            duration: 10,
            offset: 0,
            type: 'image',
            properties: { x: 50, y: 50, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }
        };

        await compositor.initialize([asset]);

        await compositor.renderFrame(mockCtx, 5, {
            tracks: [{ id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: ['c1'] } as Track],
            clips: { 'c1': clip },
            assets: { 'i1': asset },
            settings: projectSettings
        });

        expect(mockCtx.drawImage).toHaveBeenCalled();
    });

    it('should draw text clip', async () => {
        const clip: Clip = {
            id: 'c1',
            assetId: 'text',
            trackId: 't1',
            start: 0,
            duration: 10,
            offset: 0,
            type: 'text',
            content: 'Hello World This Is A Long Text',
            properties: { x: 50, y: 50, width: 1, height: 50, rotation: 0, opacity: 1, zIndex: 0 },
            textStyle: {
                fontFamily: 'Arial',
                fontSize: 20,
                fontWeight: 'bold',
                color: 'red',
                textAlign: 'center'
            }
        };

        // Clip width is small (1% of 1000 = 10px). Text is long. Should wrap.

        await compositor.renderFrame(mockCtx, 5, {
            tracks: [{ id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: ['c1'] } as Track],
            clips: { 'c1': clip },
            assets: {},
            settings: projectSettings
        });

        expect(mockCtx.fillText).toHaveBeenCalled();
        expect(mockCtx.fillText).toHaveBeenCalledTimes(7); // 7 words, each on new line
    });
  });

  describe('drawMap', () => {
      const projectSettings: ProjectSettings = { width: 1000, height: 1000, fps: 30 };

      it('should draw map with tiles and path', async () => {
        const asset: Asset = {
            id: 'gpx1',
            type: 'gpx',
            src: 'track.gpx',
            name: 'Track',
            geoJson: {
                features: [{
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [[0, 0], [1, 1]]
                    },
                    properties: {
                        coordTimes: ['2023-01-01T00:00:00Z', '2023-01-01T00:00:10Z']
                    }
                }]
            }
        };
        const clip: Clip = {
            id: 'c1',
            assetId: 'gpx1',
            trackId: 't1',
            start: 0,
            duration: 10,
            offset: 0,
            type: 'map',
            properties: { x: 50, y: 50, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0, mapZoom: 10, trackStyle: { color: 'red', weight: 2 }, markerStyle: { color: 'blue', type: 'dot' } }
        };

        // Mock mapUtils
        (mapUtils.getGpxPositionAtTime as jest.Mock).mockReturnValue([0.5, 0.5]);
        (mapUtils.lon2tile as jest.Mock).mockReturnValue(10);
        (mapUtils.lat2tile as jest.Mock).mockReturnValue(10);
        (mapUtils.getTileUrl as jest.Mock).mockReturnValue('http://tile.png');

        await compositor.renderFrame(mockCtx, 5, {
            tracks: [{ id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: ['c1'] } as Track],
            clips: { 'c1': clip },
            assets: { 'gpx1': asset },
            settings: projectSettings
        });

        // Verify tile drawing
        expect(mapUtils.getTileUrl).toHaveBeenCalled();
        expect(mockCtx.drawImage).toHaveBeenCalled(); // Tiles

        // Verify path drawing
        expect(mockCtx.stroke).toHaveBeenCalled(); // Path and marker border

        // Verify marker drawing
        expect(mockCtx.arc).toHaveBeenCalled(); // Marker dot
      });
  });
});
