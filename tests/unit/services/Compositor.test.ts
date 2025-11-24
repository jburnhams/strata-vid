import { Compositor } from '../../../src/services/Compositor';
import { Asset, Clip, Track, ProjectSettings } from '../../../src/types';

// Mock mapUtils
jest.mock('../../../src/utils/mapUtils', () => ({
  ...jest.requireActual('../../../src/utils/mapUtils'),
  getTileUrl: jest.fn(() => 'http://mock.tile/tile.png'),
  getGpxPositionAtTime: jest.fn(() => [10, 20]), // lon, lat
  lon2tile: jest.fn(() => 100),
  lat2tile: jest.fn(() => 100),
}));

describe('Compositor', () => {
  let compositor: Compositor;
  let mockCtx: any;

  beforeEach(() => {
    compositor = new Compositor();
    mockCtx = {
      canvas: { width: 1000, height: 1000 },
      clearRect: jest.fn(),
      fillStyle: '',
      fillRect: jest.fn(),
      drawImage: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      resetTransform: jest.fn(),
      beginPath: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      lineWidth: 0,
      strokeStyle: '',
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 10 })),
      globalAlpha: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
    };

    // Mock global Image
    global.Image = class extends Image {
        constructor() {
            super();
        }
        _src = '';
        set src(val: string) {
            this._src = val;
            // Trigger onload immediately
            if (this.onload) (this.onload as any)();
        }
        get src() { return this._src; }
        width = 100;
        height = 100;
    } as any;

    // Mock document.createElement('video')
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: any) => {
        if (tagName === 'video') {
            return {
                src: '',
                load: jest.fn(),
                remove: jest.fn(),
                addEventListener: jest.fn((evt, cb) => cb()), // Immediate seeked
                removeEventListener: jest.fn(),
                currentTime: 0,
                videoWidth: 100,
                videoHeight: 100,
                play: jest.fn(),
                pause: jest.fn(),
            } as any;
        }
        return originalCreateElement(tagName, options);
    });
  });

  afterEach(() => {
    compositor.cleanup();
    jest.restoreAllMocks();
  });

  it('should render text clip', async () => {
      const clip: Clip = {
          id: 'c1', assetId: 'none', trackId: 't1', start: 0, duration: 5, offset: 0,
          properties: { x: 50, y: 50, width: 50, height: 10, rotation: 0, opacity: 1, zIndex: 1 },
          type: 'text',
          content: 'Hello World',
          textStyle: { fontFamily: 'Arial', fontSize: 20, fontWeight: 'bold', color: 'red', textAlign: 'center' }
      };
      const tracks: Track[] = [{ id: 't1', type: 'overlay', label: 'T', isMuted: false, isLocked: false, clips: ['c1'] }];
      const settings: ProjectSettings = { width: 1000, height: 1000, fps: 30, duration: 10, previewQuality: 'high', snapToGrid: true, allowOverlaps: true };

      await compositor.renderFrame(mockCtx, 0, { tracks, clips: { c1: clip }, assets: {}, settings });

      expect(mockCtx.fillText).toHaveBeenCalledWith(expect.stringContaining('Hello'), expect.any(Number), expect.any(Number));
      expect(mockCtx.fillStyle).toBe('red');
  });

  it('should render image clip with contain', async () => {
      const asset: Asset = { id: 'a1', type: 'image', src: 'img.png', name: 'img' };
      const clip: Clip = {
          id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 5, offset: 0,
          properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 },
          type: 'image'
      };

      await compositor.initialize([asset]);
      await compositor.renderFrame(mockCtx, 0, {
          tracks: [{ id: 't1', type: 'overlay', label: 'T', isMuted: false, isLocked: false, clips: ['c1'] }],
          clips: { c1: clip },
          assets: { a1: asset },
          settings: { width: 1000, height: 1000, fps: 30, duration: 10 } as any
      });

      expect(mockCtx.drawImage).toHaveBeenCalled();

      // SrcRatio = 1 (100x100). DstRatio = 1 (1000x1000 clip box).
      // Contain logic: drawW = 1000, drawH = 1000.
      // dx = -500, dy = -500.
      const calls = mockCtx.drawImage.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1]).toBe(-500); // dx
      expect(lastCall[3]).toBe(1000); // dw
  });

  it('should apply rotation and opacity', async () => {
      const clip: Clip = {
          id: 'c1', assetId: 'none', trackId: 't1', start: 0, duration: 5, offset: 0,
          properties: { x: 50, y: 50, width: 10, height: 10, rotation: 45, opacity: 0.5, zIndex: 1 },
          type: 'text',
          content: 'Rotated'
      };

      await compositor.renderFrame(mockCtx, 0, {
          tracks: [{ id: 't1', type: 'overlay', label: 'T', isMuted: false, isLocked: false, clips: ['c1'] }],
          clips: { c1: clip },
          assets: {},
          settings: { width: 1000, height: 1000, fps: 30, duration: 10 } as any
      });

      expect(mockCtx.rotate).toHaveBeenCalledWith(45 * Math.PI / 180);
      expect(mockCtx.globalAlpha).toBe(0.5);
  });

  it('should render map overlay', async () => {
      const asset: Asset = {
          id: 'g1', type: 'gpx', src: 'blob:gpx', name: 'run',
          geoJson: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[0,0]] } }] } as any
      };
      const clip: Clip = {
          id: 'c1', assetId: 'g1', trackId: 't1', start: 0, duration: 5, offset: 0,
          properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1, mapZoom: 15 },
          type: 'map'
      };

      await compositor.renderFrame(mockCtx, 0, {
          tracks: [{ id: 't1', type: 'overlay', label: 'T', isMuted: false, isLocked: false, clips: ['c1'] }],
          clips: { c1: clip },
          assets: { g1: asset },
          settings: { width: 1000, height: 1000, fps: 30, duration: 10 } as any
      });

      expect(mockCtx.drawImage).toHaveBeenCalled(); // tiles
      expect(mockCtx.stroke).toHaveBeenCalled(); // path
  });
});
