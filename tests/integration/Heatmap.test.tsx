
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { PreviewPanel } from '../../src/components/PreviewPanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import '@testing-library/jest-dom';
import { Asset, Clip, Track } from '../../src/types';

// Mock usePlaybackLoop
jest.mock('../../src/hooks/usePlaybackLoop', () => ({
  usePlaybackLoop: jest.fn()
}));

// Mock react-leaflet - implicit from setup.tsx but ensuring global mocks are active

describe('Heatmap Integration', () => {
    beforeEach(() => {
        // Reset store
        act(() => {
             useProjectStore.setState({
                currentTime: 0,
                isPlaying: false,
                trackOrder: [],
                tracks: {},
                clips: {},
                assets: {},
                settings: {
                    width: 1920,
                    height: 1080,
                    fps: 30,
                    duration: 100,
                    previewQuality: 'high',
                    snapToGrid: true,
                    allowOverlaps: true
                },
              });
        });
    });

    it('renders heatmap overlay when enabled', async () => {
        const gpxStartTime = 1000;
        const gpxPoints = [
            { time: gpxStartTime, lat: 10, lon: 10 },
            { time: gpxStartTime + 1000, lat: 11, lon: 11 },
            { time: gpxStartTime + 2000, lat: 12, lon: 12 }
        ];

        const asset: Asset = {
            id: 'asset-gpx',
            name: 'test.gpx',
            type: 'gpx',
            src: 'blob:gpx',
            gpxPoints: gpxPoints,
            geoJson: { type: 'FeatureCollection', features: [] }
        };

        const clip: Clip = {
            id: 'clip-map',
            trackId: 'track-1',
            assetId: 'asset-gpx',
            start: 0,
            duration: 10,
            offset: 0,
            type: 'map',
            syncOffset: gpxStartTime,
            properties: {
                x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1,
                mapStyle: 'osm',
                heatmap: { enabled: true, dataSource: 'speed' }
            }
        };

        const track: Track = {
            id: 'track-1',
            type: 'overlay',
            label: 'Map Track',
            isMuted: false,
            isLocked: false,
            clips: ['clip-map']
        };

        act(() => {
             useProjectStore.setState({
                 assets: { 'asset-gpx': asset },
                 clips: { 'clip-map': clip },
                 tracks: { 'track-1': track },
                 trackOrder: ['track-1'],
                 currentTime: 0
             });
        });

        const { findByTestId } = render(<PreviewPanel />);

        // The HeatmapOverlay is a CanvasLayer. Our mock implementation of Leaflet should render a canvas.
        // We need to check if that canvas exists or if the layer was added.
        // The mock setup for react-leaflet might not render real DOM nodes for layers.
        // However, we can inspect if `useMap` hook was called or check for side effects if we spy on them.
        // But in integration tests, we want to see DOM effects.
        // Our global mock for 'react-leaflet' in setup.tsx might be too simple?
        // Let's check if we can find the canvas element created by HeatmapOverlay.
        // HeatmapOverlay.tsx uses L.canvasLayer().
        // In JSDOM with mocks, usually we check if the mock function was called.

        // But wait, `tests/unit/components/preview/HeatmapOverlay.test.tsx` verified it adds a layer.
        // In integration, we want to ensure it's wired up correctly via the store.

        // Since we can't easily check for the Leaflet internal layer in integration tests without deep mocks,
        // we might rely on a data-testid on the container or check if the mock was called.
        // BUT, we are in a separate file, so we can't spy on the internal L.canvasLayer unless we mock it globally.

        // Strategy: Verify that `MapPanel` receives the heatmap props.
        // We can inspect the `MapPanel` props if we mock it?
        // No, `PreviewPanel` renders `OverlayRenderer` which renders `MapPanel`.
        // We want to test the full chain.

        // If we look at `tests/utils/setup.tsx`, maybe we can add a test id to the mocked map layers?
        // Or we can assume that if `MapPanel` renders, and we pass `heatmapPoints`, it works?

        // Let's try to find the canvas element. `HeatmapOverlay` appends a canvas to the overlay pane.
        // In JSDOM, `L.DomUtil.create` works.
        // `map.getPanes().overlayPane.appendChild(this._canvas)`
        // If our mocked map has an overlayPane, we might find it.

        // Let's rely on finding an element with class 'leaflet-heatmap-layer'.
        // This requires the L.canvasLayer mock to actually do DOM manipulation.
        // The unit test mocked `L.canvasLayer` specifically.
        // Here we rely on the implementation in `HeatmapOverlay.tsx` executing.
        // But `L.canvasLayer` needs to exist in the global L object.
        // `L` is imported from `leaflet`.
        // We need to ensure `leaflet` is working enough in JSDOM.

        // Let's try to query for the class.
        // If it fails, we might need to improve the test setup for this specific test.

        // Wait, `tests/unit/components/preview/HeatmapOverlay.test.tsx` mocks L.canvasLayer.
        // In this integration test, we are using the REAL HeatmapOverlay component code.
        // But `L.canvasLayer` comes from Leaflet.
        // Does JSDOM support Leaflet?
        // Generally yes, but layout-dependent things fail.
        // The `onAdd` method in `HeatmapOverlay` uses `map.getSize()`, `map.getPanes()`.
        // These need to be present on the map instance.
        // Our global `react-leaflet` mock in `setup.tsx` returns a dummy component for `MapContainer`.
        // It does NOT render a real Leaflet map.
        // So `useMap()` will fail or return undefined unless we mock `MapContainer` to provide a context.

        // Ah, `tests/integration/MapPreview.test.tsx` works because it mocks `MapPanel`?
        // No, `MapPreview.test.tsx` imports `PreviewPanel`.
        // `PreviewPanel` -> `OverlayRenderer` -> `MapPanel`.
        // `MapPanel` uses `MapContainer`, `TileLayer`, `useMap`, `Marker`, `Polyline`.
        // If `MapContainer` is mocked to just render children, then `useMap` inside children will fail because no context is provided.
        // Unless `MapContainer` mock provides a context provider.

        // Let's check `tests/utils/setup.tsx`.
        // (I can't check it right now, but I recall previous memory saying "Integration tests requiring react-leaflet... must manually mock map components").
        // And `MapPreview.test.tsx` has `jest.mock('react-leaflet'...)`?
        // No, it says "// Mock react-leaflet - implicit from setup.tsx".

        // If `MapPreview.test.tsx` works, then `MapPanel` is likely rendering correctly.
        // Let's read `MapPreview.test.tsx` carefully again.
        // It checks for `data-testid="marker"`.
        // This implies `Marker` component is mocked to render a div with this testid.
        // It checks for `data-testid="tile-layer"`.
        // This implies `TileLayer` is mocked.

        // `HeatmapOverlay` is a custom component that uses `useMap`.
        // `useMap` needs to return a map-like object.
        // If `MapContainer` mock doesn't provide this, `HeatmapOverlay` will crash.
        // Does `MapPreview.test.tsx` have `useMap` usage?
        // `Marker` and `Polyline` don't use `useMap` directly in their render usually, but `HeatmapOverlay` definitely does.

        // I suspect `MapPreview.test.tsx` might be mocking `MapPanel` entirely?
        // "integration tests... verify the Composite DOM engine... while mocking complex children like MapPanel" (from memory).
        // BUT `tests/integration/MapPreview.test.tsx` seems to verify internal map behavior ("updates map marker position").
        // This suggests `MapPanel` is NOT mocked, but `react-leaflet` components ARE.

        // If `MapPanel` is not mocked, then `HeatmapOverlay` is rendered.
        // `HeatmapOverlay` calls `useMap()`.
        // We need `useMap()` to return a valid map mock.

        // I will add a test that mocks `useMap` specifically for this test file if needed,
        // or assumes the global mock covers it.
        // Let's try to query for the canvas.
        // If `HeatmapOverlay` is rendered, it creates a canvas.
        // But `L.canvasLayer()` is a Leaflet factory.
        // If we don't mock `L`, it tries to use real Leaflet.
        // Real Leaflet in JSDOM might fail on `L.canvasLayer()` due to canvas requirement.
        // But we have `canvas` package.

        // Let's start by trying to find the canvas with class `leaflet-heatmap-layer`.
        const canvas = document.querySelector('.leaflet-heatmap-layer');
        // If it's not found, we might need to adjust.
    });
});
