import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { useProjectStore } from '../../src/store/useProjectStore';
import { AssetLoader } from '../../src/services/AssetLoader';
import { parseGpxFile } from '../../src/utils/gpxParser';

// Mock dependencies
jest.mock('../../src/utils/gpxParser');
jest.mock('mediabunny', () => {
    return {
        BlobSource: jest.fn(),
        Input: jest.fn().mockImplementation(() => ({
            getFormat: jest.fn().mockResolvedValue({ duration: 100 }),
            getVideoTracks: jest.fn().mockResolvedValue([{ width: 1920, height: 1080 }]),
            dispose: jest.fn()
        }))
    };
});

// Mock URL
global.URL.createObjectURL = jest.fn(() => 'blob:test-url');

describe('Integration Flow: Load Asset -> Store Update', () => {
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
            settings: { width: 1920, height: 1080, fps: 30, duration: 0 }
        });
        jest.clearAllMocks();
    });

    it('should load a video file and add it to the store', async () => {
        const file = new File(['video-content'], 'video.mp4', { type: 'video/mp4' });

        // 1. Load Asset
        const asset = await AssetLoader.loadAsset(file);
        expect(asset).toBeDefined();
        expect(asset.type).toBe('video');
        expect(asset.duration).toBe(100); // From mock

        // 2. Add to Store
        const store = useProjectStore.getState();
        store.addAsset(asset);

        // 3. Verify Store State
        const updatedStore = useProjectStore.getState();
        expect(Object.values(updatedStore.assets)).toHaveLength(1);
        expect(updatedStore.assets[asset.id]).toEqual(asset);
    });

    it('should load a GPX file, add to store, and verify stats', async () => {
        const file = new File(['<gpx>...</gpx>'], 'track.gpx', { type: 'application/gpx+xml' });

        // Mock parser response
        (parseGpxFile as jest.Mock).mockResolvedValue({
            geoJson: { type: 'FeatureCollection', features: [] },
            stats: { distance: { total: 500 } }
        });

        // 1. Load Asset
        const asset = await AssetLoader.loadAsset(file);
        expect(asset.type).toBe('gpx');
        expect(asset.stats?.distance.total).toBe(500);

        // 2. Add to Store
        useProjectStore.getState().addAsset(asset);

        // 3. Verify Store
        const updatedStore = useProjectStore.getState();
        expect(updatedStore.assets[asset.id]).toBeDefined();
        expect(updatedStore.assets[asset.id].stats?.distance.total).toBe(500);
    });
});
