
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import App from '../../src/App';
import { AssetLoader } from '../../src/services/AssetLoader';
import { useProjectStore } from '../../src/store/useProjectStore';
import '@testing-library/jest-dom';

// Manual mocks
jest.mock('../../src/services/AssetLoader');

// Mock leaflet completely
jest.mock('leaflet', () => {
    const L = jest.requireActual('leaflet');
    // Mock L.Layer and its extend method
    L.Layer = class {
        static extend(props: any) {
            return class {
                constructor() {
                    Object.assign(this, props);
                }
                onAdd() {}
                onRemove() {}
            };
        }
    } as any;

    return {
        ...L,
        icon: jest.fn(),
        divIcon: jest.fn(),
        canvasLayer: jest.fn(() => ({
            draw: jest.fn(),
            addTo: jest.fn(),
            getCanvas: jest.fn(() => ({ getContext: () => ({ clearRect: jest.fn() }) })),
        })),
    };
});


// Mock worker-timers to prevent errors in JSDOM
jest.mock('worker-timers', () => ({
    setInterval: (callback: () => void, interval: number) => setInterval(callback, interval),
    clearInterval: (id: any) => clearInterval(id),
}));


// Mock react-leaflet
jest.mock('react-leaflet', () => ({
    MapContainer: ({ children }: any) => <div>{children}</div>,
    TileLayer: () => <div>TileLayer</div>,
    Marker: () => <div>Marker</div>,
    Popup: () => <div>Popup</div>,
    GeoJSON: () => <div>GeoJSON</div>,
    useMap: () => ({ fitBounds: jest.fn(), removeLayer: jest.fn() }),
}));

describe('App Integration - Lazy Asset Loading', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset store
        const store = useProjectStore.getState();
        store.loadProject({
            id: 'test',
            settings: { width: 1920, height: 1080, fps: 30, duration: 60, previewQuality: 'high', snapToGrid: true, allowOverlaps: false, simplificationTolerance: 0.0001 },
            assets: {},
            tracks: {},
            clips: {},
            trackOrder: []
        });

        // Default mock implementation
        (AssetLoader.loadAsset as jest.Mock).mockImplementation(async (file, options) => ({
            id: 'asset-1',
            name: file.name,
            type: 'video',
            source: 'blob:video',
            duration: 10,
            file // Ensure the file is returned
        }));

        (AssetLoader.loadThumbnail as jest.Mock).mockResolvedValue('blob:thumbnail');
        (AssetLoader.revokeAsset as jest.Mock).mockImplementation(() => {});
    });

    it('should add asset immediately and load thumbnail lazily', async () => {
        render(<App />);

        const fileInput = screen.getByTestId('add-asset-input');
        const file = new File([''], 'video.mp4', { type: 'video/mp4' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        // 1. Verify AssetLoader.loadAsset was called with simplification tolerance
        await waitFor(() => {
            expect(AssetLoader.loadAsset).toHaveBeenCalledWith(file, { simplificationTolerance: 0.0001 });
        });

        // 2. Verify asset appears in the list (LibraryPanel)
        await waitFor(() => {
            const assetItem = screen.getByRole('button', { name: /video.mp4/ });
            expect(assetItem).toBeInTheDocument();
        });

        // 3. Verify AssetLoader.loadThumbnail was called with correct args
        await waitFor(() => {
            expect(AssetLoader.loadThumbnail).toHaveBeenCalledWith(file, "video");
        });

        // 4. Verify thumbnail eventually appears
        await waitFor(() => {
            const img = screen.getByAltText('Thumbnail for video.mp4');
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute('src', 'blob:thumbnail');
        });
    });
});
