import { runExport, setIsCancelled } from '../../../src/workers/exportWorker';
import { WorkerCompositor } from '../../../src/services/WorkerCompositor';

// Mock WorkerCompositor
jest.mock('../../../src/services/WorkerCompositor');
// Mock mediabunny
jest.mock('mediabunny', () => ({
    Output: jest.fn().mockImplementation(() => ({
        addVideoTrack: jest.fn(),
        addAudioTrack: jest.fn(),
        start: jest.fn(),
        finalize: jest.fn(),
        target: { buffer: new ArrayBuffer(8) }
    })),
    Mp4OutputFormat: jest.fn(),
    WebMOutputFormat: jest.fn(),
    BufferTarget: jest.fn(),
    CanvasSource: jest.fn().mockImplementation(() => ({
        addFrame: jest.fn(),
        add: jest.fn()
    })),
    Input: jest.fn().mockImplementation(() => ({
        getAudioTracks: jest.fn().mockResolvedValue([{ id: 'track1' }])
    })),
    BlobSource: jest.fn()
}));
// Mock utils
jest.mock('../../../src/utils/audioUtils', () => ({
    createWavBlob: jest.fn(() => new Blob([]))
}));

describe('exportWorker', () => {
    const mockPostMessage = jest.fn();

    beforeAll(() => {
        // Mock global self.postMessage
        Object.defineProperty(global, 'self', {
            value: { postMessage: mockPostMessage },
            writable: true
        });

        // Mock OffscreenCanvas
        global.OffscreenCanvas = class {
            constructor(width: number, height: number) {}
            getContext() { return { filter: '' }; }
        } as any;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        setIsCancelled(false);
        (WorkerCompositor as jest.Mock).mockClear();
        (WorkerCompositor as jest.Mock).mockImplementation(() => ({
            initialize: jest.fn(),
            renderFrame: jest.fn(),
            cleanup: jest.fn()
        }));
    });

    it('runs export successfully (MP4 default)', async () => {
        const payload = {
            project: {
                settings: { duration: 0.1 }, // 3 frames at 30fps
                assets: {},
                tracks: {},
                clips: {},
                trackOrder: []
            },
            exportSettings: {
                width: 100, height: 100, fps: 30,
                format: 'mp4', videoCodec: 'avc'
            }
        };

        await runExport(payload);

        expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete' }));
    });

    it('runs export successfully (WebM)', async () => {
        const payload = {
            project: {
                settings: { duration: 0.1 },
                assets: {},
                tracks: {},
                clips: {},
                trackOrder: []
            },
            exportSettings: {
                width: 100, height: 100, fps: 30,
                format: 'webm', videoCodec: 'vp9', audioCodec: 'opus'
            },
            audioData: { channels: [], sampleRate: 44100 }
        };

        await runExport(payload);

        expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete' }));
        // Should verify WebM MIME type in blob
        const lastCall = mockPostMessage.mock.calls.find(c => c[0].type === 'complete');
        expect(lastCall[0].blob.type).toBe('video/webm');
    });

    it('handles cancellation', async () => {
        setIsCancelled(true);
        const payload = {
            project: {
                settings: { duration: 1 },
                assets: {},
                tracks: {},
                clips: {},
                trackOrder: []
            },
            exportSettings: { width: 100, height: 100, fps: 30 }
        };
        await runExport(payload);
        expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
            type: 'progress',
            progress: expect.objectContaining({ status: 'cancelled' })
        }));
    });
});
