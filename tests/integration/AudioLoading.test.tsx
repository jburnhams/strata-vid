import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { useProjectStore } from '../../src/store/useProjectStore';
import { AssetLoader } from '../../src/services/AssetLoader';
import { extractAudioMetadata } from '../../src/utils/audioUtils';

// Mock dependencies
jest.mock('../../src/utils/audioUtils');
jest.mock('mediabunny', () => {
    return {
        BlobSource: jest.fn(),
        Input: jest.fn(),
        ALL_FORMATS: []
    };
});

// Mock URL methods explicitly
if (!global.URL.createObjectURL || !(global.URL.createObjectURL as any).mock) {
    global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
}
global.URL.revokeObjectURL = jest.fn();

describe('Integration: Audio Asset Loading', () => {
    beforeEach(() => {
        // Reset store
        useProjectStore.setState({
            assets: {},
            tracks: {},
            clips: {},
            trackOrder: [],
            selectedAssetId: null,
            currentTime: 0,
            isPlaying: false,
            playbackRate: 1,
            settings: {
                width: 1920,
                height: 1080,
                fps: 30,
                duration: 0,
                previewQuality: 'medium',
                snapToGrid: true,
                allowOverlaps: false
            }
        });
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should load an audio file, extract metadata, and add it to the store', async () => {
        const file = new File(['audio-content'], 'music.mp3', { type: 'audio/mpeg' });

        // Mock utils response
        (extractAudioMetadata as jest.Mock).mockResolvedValue({
            duration: 120,
            waveform: [0.1, 0.5, 0.9]
        });

        // 1. Load Asset
        const asset = await AssetLoader.loadAsset(file);

        expect(asset).toBeDefined();
        expect(asset.type).toBe('audio');
        expect(asset.duration).toBe(120);
        expect(asset.waveform).toEqual([0.1, 0.5, 0.9]);

        // 2. Add to Store
        const store = useProjectStore.getState();
        store.addAsset(asset);

        // 3. Verify Store State
        const updatedStore = useProjectStore.getState();
        expect(Object.values(updatedStore.assets)).toHaveLength(1);
        const storedAsset = updatedStore.assets[asset.id];
        expect(storedAsset.type).toBe('audio');
        expect(storedAsset.duration).toBe(120);
        expect(storedAsset.waveform).toHaveLength(3);
    });
});
