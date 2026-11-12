import { ExportManager, type ExportSettings } from '../../../src/services/ExportManager';
import type { ProjectSettings } from '../../../src/types';
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

  const finishOnStart = () => mockWorker.postMessage.mockImplementation((msg: any) => {
    if (msg.type === 'start') {
      setTimeout(() => {
        mockWorker.onmessage?.({ data: { type: 'progress', progress: { status: 'rendering', percentage: 50 } } });
        mockWorker.onmessage?.({ data: { type: 'complete', blob: new Blob(['video'], { type: 'video/webm' }), totalFrames: 30, notes: ['A note.'] } });
      }, 0);
    }
  });

  const audibleProject = {
    ...mockProject,
    assets: { a1: { id: 'a1', type: 'audio', name: 'music.mp3', src: 'blob:a1' } } as any,
    clips: { c1: { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 1, offset: 0, volume: 1, type: 'audio' } } as any,
  };

  it('runs the export in the worker and reports the frames and notes it finished with', async () => {
    finishOnStart();
    const onProgress = jest.fn();
    const result = await exportManager.exportProject(mockProject, mockExportSettings, onProgress);

    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      { type: 'start', payload: expect.objectContaining({ project: mockProject, exportSettings: mockExportSettings, audioData: null }) },
      [],
    );
    // Nothing on the timeline makes a sound, so nothing is mixed.
    expect(AudioCompositor).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(Blob);
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'completed', totalFrames: 30, currentFrame: 30, notes: ['A note.'] }));
  });

  it('mixes the sound on the main thread and hands it to the worker', async () => {
    finishOnStart();
    await exportManager.exportProject(audibleProject, mockExportSettings, jest.fn());

    expect(AudioCompositor).toHaveBeenCalledTimes(1);
    const [message, transfer] = mockWorker.postMessage.mock.calls.find((c: any[]) => c[0].type === 'start');
    expect(message.payload.audioData.sampleRate).toBe(44100);
    expect(message.payload.audioData.channels).toHaveLength(2);
    expect(transfer).toEqual(message.payload.audioData.channels.map((c: Float32Array) => c.buffer));
  });

  it('exports without sound, and says why, when mixing fails', async () => {
    finishOnStart();
    (AudioCompositor as jest.Mock).mockImplementation(() => ({ render: jest.fn().mockRejectedValue(new Error('decode failed')) }));
    await exportManager.exportProject(audibleProject, mockExportSettings, jest.fn());

    const [message] = mockWorker.postMessage.mock.calls.find((c: any[]) => c[0].type === 'start');
    expect(message.payload.audioData).toBeNull();
    expect(message.payload.audioNote).toBe('Saved without sound: the sound could not be mixed (decode failed).');
  });

  it('stops before starting the worker when cancelled while the sound is mixed', async () => {
    let finishMix: (value: unknown) => void = () => {};
    (AudioCompositor as jest.Mock).mockImplementation(() => ({ render: jest.fn(() => new Promise((r) => { finishMix = r; })) }));
    const onProgress = jest.fn();
    const running = exportManager.exportProject(audibleProject, mockExportSettings, onProgress);

    await new Promise((r) => setTimeout(r, 0));
    exportManager.cancel();
    finishMix({ numberOfChannels: 1, sampleRate: 44100, getChannelData: () => new Float32Array(10) });

    await expect(running).resolves.toBeNull();
    expect(createExportWorker).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'cancelled' }));
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
