import React from 'react';
import { render, act } from '@testing-library/react';
import { PreviewPanel } from '../../src/components/PreviewPanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import '@testing-library/jest-dom';
import { Asset, Clip, Track } from '../../src/types';

// Mock usePlaybackLoop
jest.mock('../../src/hooks/usePlaybackLoop', () => ({
  usePlaybackLoop: jest.fn()
}));

// Mock react-leaflet - implicit from setup.tsx but ensuring global mocks are active

describe('MapPreview Integration', () => {
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

    it('updates map marker position during playback', async () => {
        const gpxStartTime = new Date('2023-01-01T10:00:00Z').getTime();
        // Create 3 points over 20 seconds
        const gpxPoints = [
            { time: gpxStartTime, lat: 10, lon: 10 },
            { time: gpxStartTime + 10000, lat: 20, lon: 20 }, // 10 seconds later
            { time: gpxStartTime + 20000, lat: 30, lon: 30 }  // 20 seconds later
        ];

        const asset: Asset = {
            id: 'asset-gpx',
            name: 'test.gpx',
            type: 'gpx',
            src: 'blob:gpx',
            gpxPoints: gpxPoints,
            stats: {
                distance: { total: 1000 },
                elevation: { gain: 0, loss: 0, max: 0, min: 0, average: 0 },
                time: { start: new Date(gpxStartTime), end: new Date(gpxStartTime + 20000), duration: 20000 }
            },
            geoJson: { type: 'FeatureCollection', features: [] } // GeoJSON required for rendering
        };

        const clip: Clip = {
            id: 'clip-map',
            trackId: 'track-1',
            assetId: 'asset-gpx',
            start: 0,
            duration: 20,
            offset: 0,
            type: 'map',
            syncOffset: gpxStartTime, // Video time 0 = GPX time start
            properties: {
                x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1,
                mapStyle: 'osm', mapZoom: 13, trackStyle: { color: 'blue', weight: 3, opacity: 1 }
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

        // 1. Check initial position (Time 0 -> Lat 10, Lon 10)
        let marker = await findByTestId('marker');
        // MapPanel converts {lat, lon} to [lat, lon] for Leaflet
        expect(marker).toHaveAttribute('data-position', JSON.stringify([10, 10]));

        // 2. Advance time to 5s
        act(() => {
            useProjectStore.setState({ currentTime: 5 });
        });

        // Should be at Lat 15, Lon 15 (Interpolated)
        marker = await findByTestId('marker');
        expect(marker).toHaveAttribute('data-position', JSON.stringify([15, 15]));

        // 3. Advance time to 10s
        act(() => {
            useProjectStore.setState({ currentTime: 10 });
        });

        marker = await findByTestId('marker');
        expect(marker).toHaveAttribute('data-position', JSON.stringify([20, 20]));
    });

    it('toggles elevation profile and seeks timeline on click', async () => {
        const gpxStartTime = new Date('2023-01-01T10:00:00Z').getTime();
        const gpxPoints = [
            { time: gpxStartTime, lat: 10, lon: 10, dist: 0, ele: 100 },
            { time: gpxStartTime + 10000, lat: 20, lon: 20, dist: 1000, ele: 200 },
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
                showElevationProfile: false
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

        const { findByTitle, findByText, queryByText } = render(<PreviewPanel />);

        // Profile should be hidden initially
        expect(queryByText('Elevation Profile')).not.toBeInTheDocument();

        // Toggle profile on
        const toggleButton = await findByTitle('Toggle Elevation Profile');
        act(() => {
            toggleButton.click();
        });

        // Profile should now be visible
        await findByText('Elevation Profile');

        // Simulate click on profile to seek
        const svg = document.querySelector('svg.w-full.h-24'); // Use specific class for profile SVG
        if (svg) {
            // Mock the geometry properties for the SVG element in JSDOM
            Object.defineProperty(svg, 'clientWidth', { value: 200, configurable: true });
            Object.defineProperty(svg, 'getBoundingClientRect', {
                value: () => ({ left: 10, top: 10, width: 200, height: 100, right: 210, bottom: 110, x: 10, y: 10, toJSON: () => '' }),
                configurable: true
            });

            act(() => {
                // Simulate a click half-way through the profile (clientX 110 = 50% progress)
                const clickEvent = new MouseEvent('click', { bubbles: true, clientX: 110 });
                svg.dispatchEvent(clickEvent);
            });
        }

        // Check if the current time has updated
        // Note: The click handler in ElevationProfile calculates a time ratio.
        // For a click at 50%, the time should be 50% of the clip duration (10s), so ~5s.
        // We'll check if it's close to 5.
        expect(useProjectStore.getState().currentTime).toBeCloseTo(5, 0);
    });
});
