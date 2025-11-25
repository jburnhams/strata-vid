import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import App from '../../src/App';
import { AssetLoader } from '../../src/services/AssetLoader';
import { useProjectStore } from '../../src/store/useProjectStore';

// Manual mocks
jest.mock('../../src/services/AssetLoader');

// Mock leaflet completely
jest.mock('leaflet', () => ({
    icon: jest.fn(),
    divIcon: jest.fn(),
    Marker: {
        prototype: {
            options: {}
        }
    },
    Map: jest.fn(),
    TileLayer: jest.fn(),
}));

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
    MapContainer: ({ children }: any) => <div>{children}</div>,
    TileLayer: () => <div>TileLayer</div>,
    Marker: () => <div>Marker</div>,
    Popup: () => <div>Popup</div>,
    GeoJSON: () => <div>GeoJSON</div>,
    useMap: () => ({ fitBounds: jest.fn() }),
}));

describe('App Integration - Lazy Asset Loading', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset store
        const store = useProjectStore.getState();
        store.loadProject({
            id: 'test',
            settings: { width: 1920, height: 1080, fps: 30, duration: 60, previewQuality: 'high', snapToGrid: true, allowOverlaps: false },
            assets: {},
            tracks: {},
            clips: {},
            trackOrder: []
        });

        // Default mock implementation
        (AssetLoader.loadAsset as jest.Mock).mockImplementation(async (file) => ({
            id: 'asset-1',
            name: file.name,
            type: 'video',
            src: 'blob:video',
            duration: 10,
            file
        }));

        (AssetLoader.loadThumbnail as jest.Mock).mockResolvedValue('blob:thumbnail');
        (AssetLoader.revokeAsset as jest.Mock).mockImplementation(() => {});
        (AssetLoader.determineType as jest.Mock).mockReturnValue('video');
    });

    it('should add asset immediately and load thumbnail lazily', async () => {
        const { container } = render(<App />);

        // Find file input inside LibraryPanel
        const libInput = container.querySelector('input[accept*="video"]') as HTMLInputElement;
        expect(libInput).toBeInTheDocument();

        const file = new File([''], 'video.mp4', { type: 'video/mp4' });

        // Trigger change wrapped in act
        await act(async () => {
            Object.defineProperty(libInput, 'files', {
                value: [file]
            });
            const event = new Event('change', { bubbles: true });
            libInput.dispatchEvent(event);
        });

        // 1. Verify AssetLoader.loadAsset was called
        await waitFor(() => {
            expect(AssetLoader.loadAsset).toHaveBeenCalled();
        });

        // 2. Verify asset appears in the list (LibraryPanel)
        // Use getAllByText and check the first one, or use a more specific selector
        await waitFor(() => {
            // The LibraryPanel items have role="button"
            const items = screen.getAllByRole('button');
            const assetItem = items.find(item => item.textContent?.includes('video.mp4'));
            expect(assetItem).toBeInTheDocument();
        });

        // 3. Verify AssetLoader.loadThumbnail was called
        expect(AssetLoader.loadThumbnail).toHaveBeenCalledWith(file);

        // 4. Verify thumbnail eventually appears
        await waitFor(() => {
            const img = screen.getByAltText('Thumbnail for video.mp4');
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute('src', 'blob:thumbnail');
        });
    });
});
