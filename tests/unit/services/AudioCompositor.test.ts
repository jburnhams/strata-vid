import { AudioCompositor } from '../../../src/services/AudioCompositor';
import { ProjectState } from '../../../src/types';
import { readFileToArrayBuffer } from '../../../src/utils/audioUtils';
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/utils/audioUtils');

describe('AudioCompositor', () => {
    let mockOfflineContext: any;
    let mockCreateGain: jest.Mock;
    let mockCreateBufferSource: jest.Mock;
    let mockStartRendering: jest.Mock;
    let mockDecodeAudioData: jest.Mock;

    beforeEach(() => {
        mockCreateGain = jest.fn(() => ({
            connect: jest.fn(),
            gain: { value: 1 }
        }));

        mockCreateBufferSource = jest.fn(() => ({
            connect: jest.fn(),
            start: jest.fn(),
            playbackRate: { value: 1 },
            buffer: null
        }));

        mockStartRendering = jest.fn().mockResolvedValue({ length: 1000, numberOfChannels: 2 } as AudioBuffer);

        mockDecodeAudioData = jest.fn().mockResolvedValue({
            duration: 10,
            getChannelData: jest.fn(),
        } as unknown as AudioBuffer);

        mockOfflineContext = {
            createGain: mockCreateGain,
            createBufferSource: mockCreateBufferSource,
            startRendering: mockStartRendering,
            decodeAudioData: mockDecodeAudioData,
            destination: {},
        };

        // Mock global OfflineAudioContext
        (window as any).OfflineAudioContext = jest.fn(() => mockOfflineContext);

        // Mock readFileToArrayBuffer
        (readFileToArrayBuffer as jest.Mock).mockResolvedValue(new ArrayBuffer(10));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render a project with audio clips', async () => {
        const project = {
            settings: { duration: 10, fps: 30 },
            tracks: {
                't1': { id: 't1', volume: 0.8, isMuted: false, clips: ['c1'] }
            },
            clips: {
                'c1': {
                    id: 'c1',
                    assetId: 'a1',
                    start: 2,
                    offset: 0,
                    duration: 5,
                    volume: 0.5,
                    type: 'audio',
                    playbackRate: 1
                }
            },
            assets: {
                'a1': { id: 'a1', type: 'audio', file: new File([''], 'test.mp3') }
            }
        } as unknown as ProjectState;

        const compositor = new AudioCompositor();
        const buffer = await compositor.render(project);

        // Verify OfflineAudioContext creation
        expect(window.OfflineAudioContext).toHaveBeenCalledWith(2, 44100 * 10, 44100);

        // Verify decoding
        expect(readFileToArrayBuffer).toHaveBeenCalled();
        expect(mockDecodeAudioData).toHaveBeenCalled();

        // Verify Buffer Source
        expect(mockCreateBufferSource).toHaveBeenCalledTimes(1);
        const source = mockCreateBufferSource.mock.results[0].value;
        expect(source.start).toHaveBeenCalledWith(2, 0, 5); // start, offset, duration

        // Verify output
        expect(buffer).toBeDefined();
        expect(mockStartRendering).toHaveBeenCalled();
    });

    it('should handle playback rate', async () => {
        const project = {
            settings: { duration: 10 },
            tracks: {
                't1': { id: 't1', volume: 1, isMuted: false, clips: ['c1'] }
            },
            clips: {
                'c1': {
                    id: 'c1',
                    assetId: 'a1',
                    type: 'audio',
                    start: 0,
                    duration: 5, // Timeline duration
                    offset: 0,
                    volume: 1,
                    playbackRate: 2 // 2x speed
                }
            },
            assets: {
                'a1': { id: 'a1', type: 'audio', file: new File([''], 'test.mp3') }
            }
        } as unknown as ProjectState;

        const compositor = new AudioCompositor();
        await compositor.render(project);

        const source = mockCreateBufferSource.mock.results[0].value;
        expect(source.playbackRate.value).toBe(2);
        // Play duration should be 5 (timeline duration), start() handles internal rate scaling
        expect(source.start).toHaveBeenCalledWith(0, 0, 5);
    });

    it('should handle muted tracks', async () => {
        const project = {
            settings: { duration: 10 },
            tracks: {
                't1': { id: 't1', volume: 1, isMuted: true, clips: ['c1'] }
            },
            clips: {
                'c1': { id: 'c1', assetId: 'a1', type: 'audio', start: 0, duration: 1, offset: 0, volume: 1 }
            },
            assets: {
                'a1': { id: 'a1', type: 'audio', file: new File([''], 'test.mp3') }
            }
        } as unknown as ProjectState;

        const compositor = new AudioCompositor();
        await compositor.render(project);

        // Track gain should be 0
        // Find track gain (it's created after master gain, so index 1)
        const trackGain = mockCreateGain.mock.results[1].value;
        expect(trackGain.gain.value).toBe(0);
    });

    it('should skip non-audio assets', async () => {
        const project = {
            settings: { duration: 10 },
            tracks: {
                't1': { id: 't1', clips: ['c1'] }
            },
            clips: {
                'c1': { id: 'c1', assetId: 'a1', type: 'image', start: 0 }
            },
            assets: {
                'a1': { id: 'a1', type: 'image', file: new File([''], 'test.jpg') }
            }
        } as unknown as ProjectState;

        const compositor = new AudioCompositor();
        await compositor.render(project);

        expect(mockCreateBufferSource).not.toHaveBeenCalled();
    });
});
