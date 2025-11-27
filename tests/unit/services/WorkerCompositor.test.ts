import { WorkerCompositor } from '../../../src/services/WorkerCompositor';
import { Asset, Clip, ProjectSettings } from '../../../src/types';

jest.mock('mediabunny', () => ({
  Input: jest.fn().mockImplementation(() => ({
    getFrame: jest.fn().mockResolvedValue({
        image: { width: 100, height: 100, close: jest.fn(), displayWidth: 100, displayHeight: 100 }
    }),
    dispose: jest.fn()
  })),
  BlobSource: jest.fn(),
  ALL_FORMATS: []
}));

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    blob: jest.fn().mockResolvedValue(new Blob(['']))
} as any);

// Mock OffscreenCanvas
class MockOffscreenCanvas {
    width: number;
    height: number;
    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }
    getContext() {
        return {
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
            measureText: jest.fn(() => ({ width: 0 })),
            fillText: jest.fn(),
            canvas: { width: this.width, height: this.height },
            globalAlpha: 1,
            filter: 'none'
        };
    }
}
global.OffscreenCanvas = MockOffscreenCanvas as any;

describe('WorkerCompositor', () => {
  let compositor: WorkerCompositor;

  beforeEach(() => {
    compositor = new WorkerCompositor();
    jest.clearAllMocks();
  });

  afterEach(() => {
      compositor.cleanup();
  });

  it('should initialize assets', async () => {
    const assets: Asset[] = [
        { id: 'v1', type: 'video', src: 'blob:v1', file: new File([''], 'v1.mp4') } as Asset,
        { id: 'i1', type: 'image', src: 'blob:i1' } as Asset
    ];
    await compositor.initialize(assets);
  });

  it('should render video frame', async () => {
    const assets: Record<string, Asset> = {
        'v1': { id: 'v1', type: 'video', src: 'blob:v1', file: new File([''], 'v1.mp4') } as Asset
    };
    await compositor.initialize(Object.values(assets));

    const canvas = new OffscreenCanvas(100, 100);
    const ctx = canvas.getContext('2d') as any;
    const project = {
        tracks: [{ id: 't1', type: 'video', clips: ['c1'], isMuted: false, label: '', isLocked: false }],
        clips: { 'c1': { id: 'c1', assetId: 'v1', trackId: 't1', start: 0, duration: 10, offset: 0, properties: { x: 50, y: 50, width: 100, height: 100, opacity: 1, rotation: 0, zIndex: 0 }, type: 'video' } as Clip },
        assets,
        settings: { width: 100, height: 100, duration: 10 } as ProjectSettings
    };

    await compositor.renderFrame(ctx, 5, project as any);

    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it('should render image frame', async () => {
      const assets: Record<string, Asset> = {
          'i1': { id: 'i1', type: 'image', src: 'blob:i1' } as Asset
      };
      await compositor.initialize(Object.values(assets));

      const canvas = new OffscreenCanvas(100, 100);
      const ctx = canvas.getContext('2d') as any;
      const project = {
          tracks: [{ id: 't1', type: 'overlay', clips: ['c1'], isMuted: false, label: '', isLocked: false }],
          clips: { 'c1': { id: 'c1', assetId: 'i1', trackId: 't1', start: 0, duration: 10, offset: 0, properties: { x: 50, y: 50, width: 100, height: 100, opacity: 1, rotation: 0, zIndex: 0 }, type: 'image' } as Clip },
          assets,
          settings: { width: 100, height: 100, duration: 10 } as ProjectSettings
      };

      await compositor.renderFrame(ctx, 5, project as any);

      expect(ctx.drawImage).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('blob:i1');
  });
});
