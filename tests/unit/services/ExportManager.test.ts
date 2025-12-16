import { ExportManager, ExportSettings } from '../../../src/services/ExportManager';
import { ProjectSettings } from '../../../src/types';
import { createExportWorker } from '../../../src/utils/workerUtils';
import { AudioCompositor } from '../../../src/services/AudioCompositor';

// Mock workerUtils
jest.mock('../../../src/utils/workerUtils');

// Mock AudioCompositor
jest.mock('../../../src/services/AudioCompositor');

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

  const mockExportSettings: ExportSettings = {
      width: 100,
      height: 100,
      fps: 30,
      format: 'webm',
      videoCodec: 'vp9',
      audioCodec: 'opus',
      audioBitrate: 128000
  };

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

    // Default success mock for AudioCompositor
    (AudioCompositor as jest.Mock).mockImplementation(() => ({
      render: jest.fn().mockResolvedValue({
        numberOfChannels: 2,
        sampleRate: 44100,
        getChannelData: jest.fn().mockReturnValue(new Float32Array(100))
      })
    }));
  });

  it('should run export successfully and delegate audio to worker', async () => {
    mockWorker.postMessage.mockImplementation((msg: any) => {
         if (msg.type === 'start') {
             setTimeout(() => {
                 if (mockWorker.onmessage) {
                    mockWorker.onmessage({ data: { type: 'progress', progress: { status: 'initializing' } } });
                    mockWorker.onmessage({ data: { type: 'progress', progress: { status: 'rendering', percentage: 50 } } });
                    mockWorker.onmessage({ data: { type: 'complete', blob: new Blob(['video'], {type: 'video/webm'}) } });
                 }
             }, 0);
         }
    });

    const onProgress = jest.fn();
    const result = await exportManager.exportProject(mockProject, mockExportSettings, onProgress);

    // Verify correct start message
    // Note: audioData should NOT be present (or be undefined), and no transferables (2nd arg)
    expect(mockWorker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: 'start',
        payload: expect.objectContaining({
            project: mockProject,
            exportSettings: mockExportSettings
        })
    }));

    // Verify AudioCompositor was NOT called on main thread
    expect(AudioCompositor).not.toHaveBeenCalled();

    expect(result).toBeInstanceOf(Blob);
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
  });

  it('should handle cancellation', async () => {
    mockWorker.postMessage.mockImplementation((msg: any) => {
         if (msg.type === 'start') {
             setTimeout(() => {
                if (mockWorker.onmessage)
                    mockWorker.onmessage({ data: { type: 'progress', progress: { status: 'rendering', percentage: 10 } } });
             }, 0);
         }
         if (msg.type === 'cancel') {
             setTimeout(() => {
                if (mockWorker.onmessage)
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
  });

  it('should handle worker error message', async () => {
     mockWorker.postMessage.mockImplementation((msg: any) => {
         if (msg.type === 'start') {
             setTimeout(() => {
                 if (mockWorker.onmessage)
                    mockWorker.onmessage({ data: { type: 'error', error: 'Worker crashed' } });
             }, 0);
         }
     });

     const onProgress = jest.fn();
     await expect(exportManager.exportProject(mockProject, mockExportSettings, onProgress)).rejects.toThrow('Worker crashed');
  });

  it('should handle worker onerror event', async () => {
     mockWorker.postMessage.mockImplementation((msg: any) => {
         if (msg.type === 'start') {
             setTimeout(() => {
                 if (mockWorker.onerror)
                    mockWorker.onerror({ message: 'Worker internal error' });
             }, 0);
         }
     });

     const onProgress = jest.fn();
     await expect(exportManager.exportProject(mockProject, mockExportSettings, onProgress)).rejects.toThrow('Worker internal error');
  });

  it('should fail immediately if WebCodecs not supported', async () => {
     const originalVideoEncoder = global.VideoEncoder;
     // @ts-ignore
     delete global.VideoEncoder;

     const onProgress = jest.fn();
     await expect(exportManager.exportProject(mockProject, mockExportSettings, onProgress)).rejects.toThrow(/WebCodecs/);

     global.VideoEncoder = originalVideoEncoder;
  });
});
