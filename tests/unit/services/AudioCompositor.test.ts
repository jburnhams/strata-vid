import { AudioCompositor } from '../../../src/services/AudioCompositor';
import { Asset, Clip, Track } from '../../../src/types';

// Mock OfflineAudioContext
class MockOfflineAudioContext {
    destination = {};
    constructor(channels: number, length: number, sampleRate: number) {}
    createBufferSource() {
        return {
            buffer: null,
            connect: jest.fn(),
            start: jest.fn(),
        };
    }
    createGain() {
        return {
            gain: {
                value: 1,
                setValueAtTime: jest.fn(),
                linearRampToValueAtTime: jest.fn(),
            },
            connect: jest.fn(),
        };
    }
    decodeAudioData(buffer: ArrayBuffer) {
        return Promise.resolve({ length: 100, duration: 1, numberOfChannels: 2, sampleRate: 44100 } as AudioBuffer);
    }
    startRendering() {
        return Promise.resolve({} as AudioBuffer);
    }
}

// @ts-ignore
global.OfflineAudioContext = MockOfflineAudioContext;
// @ts-ignore
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.OfflineAudioContext = MockOfflineAudioContext;
}

// Mock fetch
global.fetch = jest.fn(() => Promise.resolve({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    blob: () => Promise.resolve(new Blob(['']))
} as any));

describe('AudioCompositor', () => {
    let compositor: AudioCompositor;

    beforeEach(() => {
        compositor = new AudioCompositor();
        jest.clearAllMocks();
    });

    it('renders audio successfully', async () => {
        const project = {
            tracks: [{ id: 't1', isMuted: false, clips: ['c1'], volume: 1 } as unknown as Track],
            clips: {
                'c1': { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 5, offset: 0, volume: 1, properties: {} } as unknown as Clip
            },
            assets: {
                'a1': { id: 'a1', type: 'audio', src: 'blob:a1' } as unknown as Asset
            },
            settings: { duration: 10 }
        };

        const result = await compositor.renderAudio(project as any);
        expect(result).toBeDefined();
    });
});
