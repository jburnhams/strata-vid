
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { AssetLoader } from '../../src/services/AssetLoader';
import { useProjectStore } from '../../src/store/useProjectStore';

// Mock AssetLoader
jest.mock('../../src/services/AssetLoader');

// Mock ResizeObserver for Layout
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('Map Sync Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useProjectStore.setState({
            assets: {},
            clips: {},
            tracks: {},
            trackOrder: [],
            selectedAssetId: null,
            selectedClipId: null,
            currentTime: 0
        });
    });

    it('allows syncing video and gpx via Metadata Panel', async () => {
        // 1. Setup Data
        const creationTime = new Date('2023-01-01T10:00:00Z');
        const gpxStartTime = new Date('2023-01-01T10:00:10Z'); // 10s later

        const mockVideoAsset = {
            id: 'video-1',
            type: 'video',
            name: 'run.mp4',
            src: 'blob:video',
            duration: 60,
            creationTime: creationTime,
            creationTimeSource: 'metadata'
        };
        const mockGpxAsset = {
            id: 'gpx-1',
            type: 'gpx',
            name: 'run.gpx',
            src: 'blob:gpx',
            stats: { time: { start: gpxStartTime } },
            gpxPoints: [
                { time: gpxStartTime.getTime(), lat: 10, lon: 10 },
                { time: gpxStartTime.getTime() + 60000, lat: 20, lon: 20 }
            ],
            geoJson: { type: 'FeatureCollection', features: [] }
        };

        (AssetLoader.loadAsset as jest.Mock).mockImplementation(async (file) => {
            if (file.name.endsWith('.mp4')) return mockVideoAsset;
            if (file.name.endsWith('.gpx')) return mockGpxAsset;
            return null;
        });

        // 2. Render App
        render(<App />);

        // 3. Upload Files
        // Select the Library "Add" input which accepts video and gpx
        const fileInput = document.querySelector('input[accept*="video"]') as HTMLInputElement;
        const videoFile = new File([''], 'run.mp4', { type: 'video/mp4' });
        const gpxFile = new File([''], 'run.gpx', { type: 'application/gpx+xml' });

        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [videoFile, gpxFile] } });
        });

        // Verify assets loaded
        await waitFor(() => {
             expect(Object.values(useProjectStore.getState().assets)).toHaveLength(2);
        });

        // Add video to Timeline manually
        // We click the first "Add to Timeline" button found, assuming it corresponds to the video asset
        const addBtns = await screen.findAllByLabelText(/Add .* to timeline/i);
        fireEvent.click(addBtns[0]);

        // Verify Video Clip was added
        await waitFor(() => {
             expect(Object.values(useProjectStore.getState().clips)).toHaveLength(1); // Video only
        });

        // 4. Manually add Map Clip (simulating DnD)
        const mapClipId = 'map-clip-1';
        act(() => {
             // Create a new track for map
             useProjectStore.getState().addTrack({
                 id: 'track-map',
                 type: 'overlay',
                 label: 'Map Track',
                 isMuted: false,
                 isLocked: false,
                 clips: []
             });

             useProjectStore.getState().addClip({
                 id: mapClipId,
                 assetId: mockGpxAsset.id,
                 trackId: 'track-map',
                 start: 0,
                 duration: 60,
                 offset: 0,
                 type: 'map',
                 properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 }
             });
        });

        expect(Object.values(useProjectStore.getState().clips)).toHaveLength(2);

        // 5. Select the Map Clip
        act(() => {
            useProjectStore.getState().selectClip(mapClipId);
        });

        // 6. Verify Metadata Panel shows Sync Controls
        // Look for "Auto-Sync to Video Metadata" button
        const autoSyncBtn = screen.getByText('Auto-Sync to Video Metadata');
        expect(autoSyncBtn).toBeInTheDocument();
        expect(autoSyncBtn).not.toBeDisabled();

        // 7. Click Auto-Sync
        fireEvent.click(autoSyncBtn);

        // 8. Verify Sync Offset in Store
        const expectedOffset = creationTime.getTime();
        expect(useProjectStore.getState().clips[mapClipId].syncOffset).toBe(expectedOffset);

        // 9. Verify MapPanel styling update
        // Change Map Style to 'Satellite'

        // Find the select by label text since we added htmlFor
        const styleSelect = screen.getByLabelText('Map Style');
        expect(styleSelect).toBeInTheDocument();

        // 10. Update Styling via UI
        fireEvent.change(styleSelect!, { target: { value: 'satellite' } });

        // Verify MapPanel (in Preview) received the prop.
        // The PreviewPanel renders MapPanel.
        const tileLayer = screen.getByTestId('tile-layer');
        expect(tileLayer).toHaveAttribute('data-url', expect.stringContaining('arcgisonline'));
    });
});
