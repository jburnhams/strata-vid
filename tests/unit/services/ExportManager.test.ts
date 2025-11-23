import { ExportManager } from '../../../src/services/ExportManager';
import { ProjectSettings } from '../../../src/types';

jest.mock('mediabunny', () => ({
  Output: jest.fn().mockImplementation(() => ({
    addVideoTrack: jest.fn(),
    start: jest.fn(),
    finalize: jest.fn(),
    target: { buffer: new ArrayBuffer(0) }
  })),
  Mp4OutputFormat: jest.fn(),
  BufferTarget: jest.fn(),
  CanvasSource: jest.fn().mockImplementation(() => ({
      addFrame: jest.fn()
  })),
}));

// Mock Compositor
jest.mock('../../../src/services/Compositor', () => ({
  Compositor: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    renderFrame: jest.fn(),
    cleanup: jest.fn(),
  }))
}));

// Mock OffscreenCanvas
global.OffscreenCanvas = class {
    width: number;
    height: number;
    constructor(w: number, h: number) { this.width = w; this.height = h; }
    getContext() { return { canvas: this }; }
} as any;

describe('ExportManager', () => {
  let exportManager: ExportManager;
  const mockProject = {
      id: 'p1',
      settings: { width: 100, height: 100, fps: 30, duration: 1 } as ProjectSettings,
      assets: {},
      tracks: {},
      clips: {},
      trackOrder: []
  };

  beforeEach(() => {
    exportManager = new ExportManager();
  });

  it('should run export loop', async () => {
    const onProgress = jest.fn();
    const result = await exportManager.exportProject(mockProject, onProgress);

    expect(result).toBeInstanceOf(Blob);
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
  });

  it('should handle cancellation', async () => {
    const onProgress = jest.fn((p) => {
        if (p.currentFrame > 5) {
            exportManager.cancel();
        }
    });

    // Set duration to have enough frames
    const longProject = { ...mockProject, settings: { ...mockProject.settings, duration: 1 } }; // 30 frames

    const result = await exportManager.exportProject(longProject, onProgress);

    expect(result).toBeNull();
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
  });
});
