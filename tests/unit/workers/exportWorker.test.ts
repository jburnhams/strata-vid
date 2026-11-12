import { runExport, setIsCancelled } from '../../../src/workers/exportWorker';
import { WorkerCompositor } from '../../../src/services/WorkerCompositor';

// Mock WorkerCompositor
jest.mock('../../../src/services/WorkerCompositor');
// Mock mediabunny
const mockAudioSource = { add: jest.fn().mockResolvedValue(undefined) };
const mockOutput = {
    addVideoTrack: jest.fn(),
    addAudioTrack: jest.fn(),
    start: jest.fn(),
    finalize: jest.fn(),
    target: { buffer: new ArrayBuffer(8) }
};
const mockCanEncodeAudio = jest.fn();
const mockCanEncodeVideo = jest.fn();
jest.mock('mediabunny', () => ({
    Output: jest.fn().mockImplementation(() => mockOutput),
    Mp4OutputFormat: jest.fn().mockImplementation(() => ({
        getSupportedVideoCodecs: () => ['avc', 'hevc', 'vp9', 'av1'],
        getSupportedAudioCodecs: () => ['aac', 'opus', 'mp3'],
    })),
    WebMOutputFormat: jest.fn().mockImplementation(() => ({
        getSupportedVideoCodecs: () => ['vp9', 'vp8', 'av1'],
        getSupportedAudioCodecs: () => ['opus', 'vorbis'],
    })),
    BufferTarget: jest.fn(),
    CanvasSource: jest.fn().mockImplementation(() => ({ add: jest.fn() })),
    AudioSampleSource: jest.fn().mockImplementation(() => mockAudioSource),
    AudioSample: jest.fn().mockImplementation((init: any) => ({ init, close: jest.fn() })),
    canEncodeAudio: (...args: any[]) => mockCanEncodeAudio(...args),
    canEncodeVideo: (...args: any[]) => mockCanEncodeVideo(...args),
}));
import { AudioSampleSource, AudioSample } from 'mediabunny';

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
        mockCanEncodeAudio.mockResolvedValue(true);
        mockCanEncodeVideo.mockResolvedValue(true);
        (WorkerCompositor as jest.Mock).mockClear();
        (WorkerCompositor as jest.Mock).mockImplementation(() => ({
            initialize: jest.fn(),
            planFrames: jest.fn(),
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

    const project = { settings: { duration: 2.5 }, assets: {}, tracks: {}, clips: {}, trackOrder: [] };
    const sound = (seconds: number, sampleRate = 48000) => ({
        channels: [new Float32Array(seconds * sampleRate).fill(0.25), new Float32Array(seconds * sampleRate).fill(-0.25)],
        sampleRate,
    });
    const completed = () => mockPostMessage.mock.calls.find((c) => c[0].type === 'complete')?.[0];

    it('plans the video frames before the first frame is drawn', async () => {
        await runExport({ project, exportSettings: { width: 100, height: 100, fps: 10 } });
        // The worker made its compositor when it loaded; its methods are the automock's, on the prototype.
        const compositor = WorkerCompositor.prototype as unknown as Record<string, jest.Mock>;
        expect(compositor.planFrames).toHaveBeenCalledWith(expect.anything(), 10, 25);
        expect(compositor.planFrames.mock.invocationCallOrder[0]).toBeLessThan(compositor.renderFrame.mock.invocationCallOrder[0]);
        expect(compositor.renderFrame).toHaveBeenCalledTimes(25);
        expect(completed()).toEqual(expect.objectContaining({ totalFrames: 25, notes: [] }));
    });

    it('encodes the sound it is given, in one-second planar samples, in the chosen codec', async () => {
        await runExport({ project, exportSettings: { width: 100, height: 100, fps: 10, format: 'webm', audioCodec: 'opus' }, audioData: sound(2.5) });
        expect(AudioSampleSource).toHaveBeenCalledWith(expect.objectContaining({ codec: 'opus' }));
        expect(mockOutput.addAudioTrack).toHaveBeenCalledWith(mockAudioSource);
        const samples = (AudioSample as unknown as jest.Mock).mock.calls.map((c) => c[0]);
        expect(samples.map((s) => s.timestamp)).toEqual([0, 1, 2]);
        expect(samples.map((s) => s.data.length)).toEqual([96000, 96000, 48000]);
        expect(samples[0]).toEqual(expect.objectContaining({ format: 'f32-planar', numberOfChannels: 2, sampleRate: 48000 }));
        // Planar: the first channel's samples, then the second's.
        expect(samples[2].data[0]).toBe(0.25);
        expect(samples[2].data[24000]).toBe(-0.25);
        expect(completed().notes).toEqual([]);
    });

    it('swaps to a codec the browser can encode, and says so', async () => {
        mockCanEncodeAudio.mockImplementation(async (codec: string) => codec === 'opus');
        await runExport({ project, exportSettings: { width: 100, height: 100, fps: 10, format: 'mp4', audioCodec: 'aac' }, audioData: sound(1) });
        expect(AudioSampleSource).toHaveBeenCalledWith(expect.objectContaining({ codec: 'opus' }));
        expect(completed().notes).toEqual(['The sound is Opus: this browser cannot encode AAC.']);
    });

    it('says the export has no sound when no codec can be encoded', async () => {
        mockCanEncodeAudio.mockResolvedValue(false);
        await runExport({ project, exportSettings: { width: 100, height: 100, fps: 10, format: 'mp4', audioCodec: 'aac' }, audioData: sound(1) });
        expect(mockOutput.addAudioTrack).not.toHaveBeenCalled();
        expect(completed().notes).toEqual(['Saved without sound: this browser cannot encode AAC audio.']);
    });

    it('passes on the note from the main thread when the sound could not be mixed', async () => {
        await runExport({ project, exportSettings: { width: 100, height: 100, fps: 10 }, audioNote: 'Saved without sound: the sound could not be mixed (decode failed).' });
        expect(completed().notes).toEqual(['Saved without sound: the sound could not be mixed (decode failed).']);
    });

    it('stops with a reason when the browser cannot encode the chosen video codec', async () => {
        mockCanEncodeVideo.mockResolvedValue(false);
        await expect(runExport({ project, exportSettings: { width: 1920, height: 1080, fps: 30, videoCodec: 'hevc' } }))
            .rejects.toThrow('This browser cannot encode H.265 video at 1920×1080. Choose another video codec or a smaller size.');
    });

    it('stops with a reason when the container cannot hold the chosen video codec', async () => {
        await expect(runExport({ project, exportSettings: { width: 100, height: 100, fps: 30, format: 'webm', videoCodec: 'avc' } }))
            .rejects.toThrow('WebM cannot hold H.264 video. Choose another video codec.');
    });
});
