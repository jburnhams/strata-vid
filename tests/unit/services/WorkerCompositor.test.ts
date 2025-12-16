
import { WorkerCompositor } from '../../../src/services/WorkerCompositor';
import { Asset, Clip, ProjectSettings, Track } from '../../../src/types';
import { Input, CanvasSink } from 'mediabunny';

// Mock mediabunny
const mockInput = {
    getPrimaryVideoTrack: jest.fn().mockResolvedValue({ id: 1 }),
    dispose: jest.fn(),
};

const mockCanvasSink = {
    canvasesAtTimestamps: jest.fn(() => ({
         [Symbol.asyncIterator]: () => ({
             next: jest.fn().mockResolvedValue({
                 value: {
                    canvas: {
                        width: 100,
                        height: 100,
                        getContext: jest.fn()
                    },
                    timestamp: 0,
                    duration: 1
                 },
                 done: false
             })
         })
    }))
};

jest.mock('mediabunny', () => ({
  Input: jest.fn(() => mockInput),
  BlobSource: jest.fn(),
  CanvasSink: jest.fn(() => mockCanvasSink),
  ALL_FORMATS: []
}));

// Mock fetch
global.fetch = jest.fn();

// Mock ImageBitmap
const mockImageBitmap = {
    width: 100,
    height: 100,
    close: jest.fn(),
};
global.createImageBitmap = jest.fn().mockResolvedValue(mockImageBitmap) as any;

// Mock mapUtils
jest.mock('../../../src/utils/mapUtils', () => ({
    getGpxPositionAtTime: jest.fn().mockReturnValue([0, 0]),
    lat2tile: jest.fn().mockReturnValue(1),
    lon2tile: jest.fn().mockReturnValue(1),
    getTileUrl: jest.fn().mockReturnValue('http://tile.url'),
    TILE_SIZE: 256
}));

// Mock animationUtils
jest.mock('../../../src/utils/animationUtils', () => ({
    interpolateValue: jest.fn((keyframes, time, defaultVal) => defaultVal)
}));

// Mock layoutUtils
jest.mock('../../../src/utils/layoutUtils', () => ({
    calculateObjectFit: jest.fn().mockReturnValue({ dw: 100, dh: 100, dx: 0, dy: 0 })
}));

describe('WorkerCompositor', () => {
  let compositor: WorkerCompositor;
  let mockCtx: any;
  let strokeCalls: string[] = [];

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementation for fresh state
    mockInput.getPrimaryVideoTrack.mockResolvedValue({ id: 1 });
    (CanvasSink as unknown as jest.Mock).mockClear();
    (Input as unknown as jest.Mock).mockClear();

    (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        blob: jest.fn().mockResolvedValue(new Blob([''])),
        json: jest.fn().mockResolvedValue({})
    });

    compositor = new WorkerCompositor();

    strokeCalls = [];
    mockCtx = {
        clearRect: jest.fn(),
        fillStyle: '',
        fillRect: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        beginPath: jest.fn(),
        rect: jest.fn(),
        clip: jest.fn(),
        drawImage: jest.fn(),
        measureText: jest.fn(() => ({ width: 50 })),
        fillText: jest.fn(),
        stroke: jest.fn().mockImplementation(() => {
            strokeCalls.push(mockCtx.strokeStyle);
        }),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        canvas: { width: 100, height: 100 },
        globalAlpha: 1,
        filter: 'none',
        strokeStyle: '#000000', // default
        lineWidth: 1
    };
  });

  afterEach(() => {
      compositor.cleanup();
  });

  const createProject = (clips: Record<string, Clip>, assets: Record<string, Asset>, tracks: Track[]) => ({
      tracks,
      clips,
      assets,
      settings: { width: 100, height: 100, duration: 10 } as ProjectSettings
  });

  it('should initialize video and image assets', async () => {
    const assets: Asset[] = [
        { id: 'v1', type: 'video', src: 'blob:v1', file: new File([''], 'v1.mp4') } as Asset,
        { id: 'i1', type: 'image', src: 'blob:i1' } as Asset
    ];
    await compositor.initialize(assets);
    expect(Input).toHaveBeenCalledTimes(1);
    expect(CanvasSink).toHaveBeenCalledTimes(1);
    expect(global.createImageBitmap).toHaveBeenCalledTimes(1);
  });

  it('should ignore duplicate initialization', async () => {
      const assets: Asset[] = [
          { id: 'v1', type: 'video', src: 'blob:v1', file: new File([''], 'v1.mp4') } as Asset
      ];
      await compositor.initialize(assets);
      await compositor.initialize(assets);
      expect(Input).toHaveBeenCalledTimes(1);
  });

  it('should handle video init failure', async () => {
      (Input as unknown as jest.Mock).mockImplementationOnce(() => { throw new Error('Fail'); });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const assets: Asset[] = [{ id: 'v1', type: 'video', src: 'blob:v1', file: new File([''], 'v1.mp4') } as Asset];
      await compositor.initialize(assets);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
  });

  it('should render text clip', async () => {
      const clip: Clip = {
          id: 'c1', trackId: 't1', type: 'text', start: 0, duration: 5, offset: 0,
          content: 'Hello World',
          properties: { x: 50, y: 50, width: 100, height: 100, opacity: 1, rotation: 0, zIndex: 0 },
          textStyle: { fontFamily: 'Arial', fontSize: 20, color: 'red', textAlign: 'center', fontWeight: 'bold' }
      };
      const project = createProject(
          { 'c1': clip },
          {},
          [{ id: 't1', type: 'text', clips: ['c1'], isMuted: false }] as Track[]
      );

      await compositor.renderFrame(mockCtx, 2, project as any);

      expect(mockCtx.fillText).toHaveBeenCalled();
      expect(mockCtx.fillStyle).toBe('red');
  });

  it('should render map clip with tiles and path', async () => {
      const geoJson = {
          features: [{
              geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
              properties: { coordTimes: ['2023-01-01T00:00:00Z', '2023-01-01T00:01:00Z'] }
          }]
      };
      const asset: Asset = { id: 'g1', type: 'gpx', src: 'blob:g1', geoJson } as Asset;
      const clip: Clip = {
          id: 'c1', trackId: 't1', type: 'map', assetId: 'g1', start: 0, duration: 10, offset: 0,
          properties: { x: 50, y: 50, width: 100, height: 100, opacity: 1, rotation: 0, zIndex: 0, mapZoom: 10, trackStyle: { color: 'blue' } }
      };

      const project = createProject(
          { 'c1': clip },
          { 'g1': asset },
          [{ id: 't1', type: 'map', clips: ['c1'], isMuted: false }] as Track[]
      );

      await compositor.initialize([asset]);
      await compositor.renderFrame(mockCtx, 5, project as any);

      expect(global.fetch).toHaveBeenCalled(); // For tiles
      expect(mockCtx.drawImage).toHaveBeenCalled(); // Tiles drawn
      expect(mockCtx.stroke).toHaveBeenCalled(); // Path drawn

      // Check that 'blue' was used during one of the stroke calls (the path one)
      // The marker stroke is usually white (#fff).
      expect(strokeCalls).toContain('blue');
  });

  it('should render extra track assets on map', async () => {
      const geoJson = {
          features: [{
              geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
              properties: { coordTimes: ['2023-01-01T00:00:00Z'] }
          }]
      };
      const asset1: Asset = { id: 'g1', type: 'gpx', src: 'blob:g1', geoJson } as Asset;
      const asset2: Asset = { id: 'g2', type: 'gpx', src: 'blob:g2', geoJson } as Asset;

      const clip: Clip = {
          id: 'c1', trackId: 't1', type: 'map', assetId: 'g1', start: 0, duration: 10, offset: 0,
          properties: { x: 50, y: 50, width: 100, height: 100, opacity: 1 },
          extraTrackAssets: [{ assetId: 'g2', trackStyle: { color: 'green' }, markerStyle: { color: 'red' } }]
      };

      const project = createProject(
          { 'c1': clip },
          { 'g1': asset1, 'g2': asset2 },
          [{ id: 't1', type: 'map', clips: ['c1'], isMuted: false }] as Track[]
      );

      await compositor.renderFrame(mockCtx, 5, project as any);

      // Expected calls: Main Path, Main Marker, Extra Path, Extra Marker = 4 calls
      expect(mockCtx.stroke).toHaveBeenCalledTimes(4);
      expect(strokeCalls).toContain('green'); // Extra track
  });

  it('should apply transitions (opacity)', async () => {
      const asset: Asset = { id: 'v1', type: 'video', src: 'blob:v1', file: new File([''], 'v1.mp4') } as Asset;
      const clip: Clip = {
          id: 'c1', trackId: 't1', type: 'video', assetId: 'v1', start: 0, duration: 10, offset: 0,
          properties: { x: 50, y: 50, width: 100, height: 100, opacity: 1 },
          transitionIn: { type: 'crossfade', duration: 2 }
      };

      const project = createProject(
        { 'c1': clip },
        { 'v1': asset },
        [{ id: 't1', type: 'video', clips: ['c1'], isMuted: false }] as Track[]
      );

      await compositor.initialize([asset]);

      // Time 1s (50% progress)
      await compositor.renderFrame(mockCtx, 1, project as any);

      expect(mockCtx.globalAlpha).toBe(0.5);
  });

  it('should apply transitions (wipe)', async () => {
      const asset: Asset = { id: 'v1', type: 'video', src: 'blob:v1', file: new File([''], 'v1.mp4') } as Asset;
      const clip: Clip = {
          id: 'c1', trackId: 't1', type: 'video', assetId: 'v1', start: 0, duration: 10, offset: 0,
          properties: { x: 50, y: 50, width: 100, height: 100, opacity: 1 },
          transitionIn: { type: 'wipe', duration: 2 }
      };

      const project = createProject(
        { 'c1': clip },
        { 'v1': asset },
        [{ id: 't1', type: 'video', clips: ['c1'], isMuted: false }] as Track[]
      );

      await compositor.initialize([asset]);

      // Time 1s (50% progress)
      await compositor.renderFrame(mockCtx, 1, project as any);

      // Check clipping rect
      expect(mockCtx.rect).toHaveBeenCalled();
  });

  it('should apply keyframe interpolation', async () => {
    const { interpolateValue } = require('../../../src/utils/animationUtils');

    const asset: Asset = { id: 'v1', type: 'video', src: 'blob:v1', file: new File([''], 'v1.mp4') } as Asset;
    const clip: Clip = {
        id: 'c1', trackId: 't1', type: 'video', assetId: 'v1', start: 0, duration: 10, offset: 0,
        properties: { x: 50, y: 50, width: 100, height: 100, opacity: 1 },
        keyframes: { opacity: [{ id: 'k1', time: 0, value: 0, easing: 'linear' }] }
    };

    const project = createProject(
        { 'c1': clip },
        { 'v1': asset },
        [{ id: 't1', type: 'video', clips: ['c1'], isMuted: false }] as Track[]
    );

    await compositor.initialize([asset]);
    await compositor.renderFrame(mockCtx, 5, project as any);

    expect(interpolateValue).toHaveBeenCalled();
  });
});
