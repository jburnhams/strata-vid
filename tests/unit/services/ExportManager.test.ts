import { ExportManager } from '../../../src/services/ExportManager';
import { ProjectSettings } from '../../../src/types';
import { createExportWorker } from '../../../src/utils/workerUtils';

// Mock workerUtils
jest.mock('../../../src/utils/workerUtils');

// Mock VideoEncoder for WebCodecs check
global.VideoEncoder = class {} as any;

describe('ExportManager', () => {
  let exportManager: ExportManager;
  let mockWorker: any;
  const mockProject = {
      id: 'p1',
      settings: { width: 100, height: 100, fps: 30, duration: 1 } as ProjectSettings,
      assets: {},
      tracks: {},
      clips: {},
      trackOrder: []
  };
  const mockExportSettings = { width: 100, height: 100, fps: 30 };

  beforeEach(() => {
    exportManager = new ExportManager();
    jest.clearAllMocks();

    mockWorker = {
        postMessage: jest.fn(),
        terminate: jest.fn(),
        onmessage: null,
        onerror: null
    };

    (createExportWorker as jest.Mock).mockReturnValue(mockWorker);
  });

  it('should run export successfully', async () => {
    mockWorker.postMessage.mockImplementation((msg: any) => {
         if (msg.type === 'start') {
             // Simulate worker flow
             setTimeout(() => {
                 mockWorker.onmessage({ data: { type: 'progress', progress: { status: 'initializing' } } });
                 mockWorker.onmessage({ data: { type: 'progress', progress: { status: 'rendering', percentage: 50 } } });
                 mockWorker.onmessage({ data: { type: 'complete', blob: new Blob(['video'], {type: 'video/mp4'}) } });
             }, 0);
         }
    });

    const onProgress = jest.fn();
    const result = await exportManager.exportProject(mockProject, mockExportSettings, onProgress);

    expect(result).toBeInstanceOf(Blob);
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it('should handle cancellation', async () => {
    mockWorker.postMessage.mockImplementation((msg: any) => {
         if (msg.type === 'start') {
             setTimeout(() => {
                mockWorker.onmessage({ data: { type: 'progress', progress: { status: 'rendering', percentage: 10 } } });
                // Trigger cancel from external logic
             }, 0);
         }
         if (msg.type === 'cancel') {
             setTimeout(() => {
                mockWorker.onmessage({ data: { type: 'progress', progress: { status: 'cancelled' } } });
             }, 0);
         }
    });

    const onProgress = jest.fn((p) => {
        if (p.status === 'rendering') {
            exportManager.cancel();
        }
    });

    const result = await exportManager.exportProject(mockProject, mockExportSettings, onProgress);

    expect(result).toBeNull();
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'cancel' });
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it('should handle worker errors', async () => {
     mockWorker.postMessage.mockImplementation((msg: any) => {
         if (msg.type === 'start') {
             setTimeout(() => {
                 mockWorker.onmessage({ data: { type: 'error', error: 'Worker crashed' } });
             }, 0);
         }
     });

     const onProgress = jest.fn();
     await expect(exportManager.exportProject(mockProject, mockExportSettings, onProgress)).rejects.toThrow('Worker crashed');

     expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', error: 'Worker crashed' }));
     expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it('should fail immediately if WebCodecs not supported', async () => {
     const originalVideoEncoder = global.VideoEncoder;
     // @ts-ignore
     delete global.VideoEncoder;

     const onProgress = jest.fn();
     await expect(exportManager.exportProject(mockProject, mockExportSettings, onProgress)).rejects.toThrow(/WebCodecs/);

     expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));

     global.VideoEncoder = originalVideoEncoder;
  });
});
