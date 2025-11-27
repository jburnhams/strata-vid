import { WorkerCompositor } from '../../../src/services/WorkerCompositor';
import { Asset, Clip, ProjectSettings } from '../../../src/types';
import { Input } from 'mediabunny';

// Mock mediabunny
const mockInput = {
    getFrame: jest.fn(),
    dispose: jest.fn(),
};

jest.mock('mediabunny', () => ({
  Input: jest.fn(() => mockInput),
  BlobSource: jest.fn(),
  ALL_FORMATS: []
}));

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    blob: jest.fn().mockResolvedValue(new Blob([''])),
    json: jest.fn().mockResolvedValue({})
} as any);

// Mock ImageBitmap
const mockImageBitmap = {
    width: 100,
    height: 100,
    close: jest.fn(),
};
global.createImageBitmap = jest.fn().mockResolvedValue(mockImageBitmap) as any;

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
            stroke: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
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
    jest.clearAllMocks();
    mockInput.getFrame.mockResolvedValue({
        image: { ...mockImageBitmap, close: jest.fn(), displayWidth: 100, displayHeight: 100 }
    });
    compositor = new WorkerCompositor();
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
    expect(Input).toHaveBeenCalledTimes(1);
    expect(global.createImageBitmap).toHaveBeenCalledTimes(1);
  });

  it('should handle initialization errors gracefully', async () => {
    const assets: Asset[] = [
        { id: 'v1', type: 'video', src: 'blob:v1', file: new File([''], 'v1.mp4') } as Asset
    ];
    (Input as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Init failed');
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    await compositor.initialize(assets);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to init video input'), expect.any(Error));
    consoleSpy.mockRestore();
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
    expect(mockInput.getFrame).toHaveBeenCalledWith(5);
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
  });

  it('should cleanup resources (J5 Memory Profiling)', async () => {
      const assets: Asset[] = [
          { id: 'v1', type: 'video', src: 'blob:v1', file: new File([''], 'v1.mp4') } as Asset,
          { id: 'i1', type: 'image', src: 'blob:i1' } as Asset
      ];
      await compositor.initialize(assets);

      compositor.cleanup();

      expect(mockInput.dispose).toHaveBeenCalled();
      expect(mockImageBitmap.close).toHaveBeenCalled();
  });

  it('should handle rendering errors gracefully', async () => {
    const assets: Record<string, Asset> = {
        'v1': { id: 'v1', type: 'video', src: 'blob:v1', file: new File([''], 'v1.mp4') } as Asset
    };
    await compositor.initialize(Object.values(assets));

    mockInput.getFrame.mockRejectedValue(new Error('Render error'));

    const canvas = new OffscreenCanvas(100, 100);
    const ctx = canvas.getContext('2d') as any;
    const project = {
        tracks: [{ id: 't1', type: 'video', clips: ['c1'], isMuted: false }],
        clips: { 'c1': { id: 'c1', assetId: 'v1', trackId: 't1', start: 0, duration: 10, offset: 0, properties: { x: 50, y: 50, width: 100, height: 100 }, type: 'video' } as Clip },
        assets,
        settings: { width: 100, height: 100 }
    };

    // Should not throw
    await expect(compositor.renderFrame(ctx, 5, project as any)).resolves.not.toThrow();
  });
});
