import { Compositor } from '../../../src/services/Compositor';
import { Asset, Clip, Track, ProjectSettings } from '../../../src/types';

// Mock mapUtils to avoid complex math and verify calls
jest.mock('../../../src/utils/mapUtils', () => ({
  ...jest.requireActual('../../../src/utils/mapUtils'),
  getTileUrl: jest.fn(() => 'http://mock.tile/tile.png'),
}));

describe('Compositor', () => {
  let compositor: Compositor;
  let mockCtx: any;

  beforeEach(() => {
    compositor = new Compositor();
    mockCtx = {
      canvas: { width: 1920, height: 1080 },
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
    };

    // Mock global Image to auto-load
    global.Image = class extends Image {
        constructor() {
            super();
            setTimeout(() => {
                if (this.onload) (this.onload as any)();
            }, 0);
        }
    } as any;
  });

  afterEach(() => {
    compositor.cleanup();
  });

  it('should initialize video pool', async () => {
    const assets: Asset[] = [
      { id: '1', type: 'video', src: 'blob:video', name: 'v1' }
    ];
    await compositor.initialize(assets);
    // accessing private property for test? Or assume it works if no error.
    // We can spy on document.createElement
    expect((compositor as any).videoPool.has('1')).toBe(true);
  });

  it('should render a video frame', async () => {
    const assets: Asset[] = [
      { id: 'a1', type: 'video', src: 'blob:video', name: 'v1' }
    ];
    const clips: Record<string, Clip> = {
      'c1': {
        id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 10, offset: 0,
        properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
        type: 'video'
      }
    };
    const tracks: Track[] = [
      { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: ['c1'] }
    ];
    const settings: ProjectSettings = { width: 1920, height: 1080, fps: 30, duration: 100 };

    await compositor.initialize(assets);

    // Mock video element behavior
    const video = (compositor as any).videoPool.get('a1');
    Object.defineProperty(video, 'currentTime', {
        get: jest.fn(() => 5), // Already at time?
        set: jest.fn(function(v) {
            setTimeout(() => this.dispatchEvent(new Event('seeked')), 0);
        })
    });

    await compositor.renderFrame(mockCtx, 5, { tracks, clips, assets: { 'a1': assets[0] }, settings });

    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  it('should render map overlay', async () => {
    const assets: Record<string, Asset> = {
        'g1': {
            id: 'g1', type: 'gpx', src: 'blob:gpx', name: 'run',
            geoJson: {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
                    properties: { coordTimes: [new Date('2023-01-01T10:00:00Z').toISOString(), new Date('2023-01-01T10:00:10Z').toISOString()] }
                }]
            } as any
        }
    };
    const clips: Record<string, Clip> = {
      'c2': {
        id: 'c2', assetId: 'g1', trackId: 't2', start: 0, duration: 10, offset: 0,
        properties: { x: 50, y: 50, width: 50, height: 50, rotation: 0, opacity: 1, zIndex: 1 },
        type: 'map'
      }
    };
    const tracks: Track[] = [
      { id: 't2', type: 'overlay', label: 'Map', isMuted: false, isLocked: false, clips: ['c2'] }
    ];
    const settings: ProjectSettings = { width: 1920, height: 1080, fps: 30, duration: 100 };

    await compositor.renderFrame(mockCtx, 5, { tracks, clips, assets, settings });

    expect(mockCtx.drawImage).toHaveBeenCalled(); // Tiles drawn
    expect(mockCtx.stroke).toHaveBeenCalled(); // Path drawn
  });
});
