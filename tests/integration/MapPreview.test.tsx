import React from 'react';
import { act, waitFor, screen, fireEvent } from '@testing-library/react';
import { installLayoutShims, renderWithStrata as render } from 'strata-react/testing';
import { mapText, showsTileOf, tileUrls } from '../utils/mapProbe';
import { PreviewPanel } from '../../src/components/PreviewPanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import '@testing-library/jest-dom';
import type { Asset, Clip, Track } from '../../src/types';

// Mock usePlaybackLoop
jest.mock('../../src/hooks/usePlaybackLoop', () => ({
  usePlaybackLoop: jest.fn()
}));


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

        render(<PreviewPanel />);

        // The view is held on the runner at the clip's zoom (13), as the export draws it, so the
        // tile under the runner is on the map and the text says how far along it is.
        // 1. Time 0: the start (10, 10)
        await waitFor(() => expect(showsTileOf(10, 10)).toBe(true));
        expect(mapText()).toMatch(/test\.gpx: 0\sm along/);

        // 2. 5 s: halfway along the first leg (15, 15)
        act(() => {
            useProjectStore.setState({ currentTime: 5 });
        });
        await waitFor(() => expect(showsTileOf(15, 15)).toBe(true));
        expect(showsTileOf(10, 10)).toBe(false);

        // 3. 10 s: the second point (20, 20)
        act(() => {
            useProjectStore.setState({ currentTime: 10 });
        });
        await waitFor(() => expect(showsTileOf(20, 20)).toBe(true));
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

        const restore = installLayoutShims({ width: 400, height: 120 });
        const { queryByRole } = render(<PreviewPanel />);

        // Profile should be hidden initially
        expect(queryByRole('heading', { name: 'Elevation profile' })).not.toBeInTheDocument();

        // Toggle profile on
        const toggleButton = await screen.findByRole('button', { name: 'Elevation profile' });
        act(() => {
            toggleButton.click();
        });

        // Profile should now be visible, as a chart with a reading a person can move
        await screen.findByRole('heading', { name: 'Elevation profile' });
        const reader = screen.getByRole('slider', { name: 'Elevation along test.gpx: read values' });

        // Choosing the last reading (the end of the track) seeks to the end of the clip
        fireEvent.keyDown(reader, { key: 'End' });
        fireEvent.keyDown(reader, { key: 'Enter' });
        expect(useProjectStore.getState().currentTime).toBeCloseTo(10, 3);
        restore();
    });

    it('updates map style when clip properties change', async () => {
        const asset: Asset = {
            id: 'asset-gpx', name: 'test.gpx', type: 'gpx', src: 'blob:gpx',
            gpxPoints: [{ time: 0, lat: 51.5, lon: -0.1 }, { time: 10_000, lat: 51.51, lon: -0.1 }],
            geoJson: { type: 'FeatureCollection', features: [] },
        };
        const clip: Clip = {
            id: 'clip-map',
            trackId: 'track-1',
            assetId: 'asset-gpx',
            start: 0,
            duration: 10,
            offset: 0,
            type: 'map',
            properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1, mapStyle: 'osm' }
        };
        const track: Track = { id: 'track-1', type: 'overlay', label: 'Map Track', isMuted: false, isLocked: false, clips: ['clip-map'] };

        act(() => {
            useProjectStore.setState({
                assets: { 'asset-gpx': asset },
                clips: { 'clip-map': clip },
                tracks: { 'track-1': track },
                trackOrder: ['track-1']
            });
        });

        render(<PreviewPanel />);

        // 1. Check initial style (OSM)
        await waitFor(() => expect(tileUrls()[0]).toContain('openstreetmap'));

        // 2. Change style to Satellite
        act(() => {
            useProjectStore.getState().updateClipProperties('clip-map', { mapStyle: 'satellite' });
        });
        await waitFor(() => expect(tileUrls()[0]).toContain('arcgisonline'));

        // 3. Change style to Dark
        act(() => {
            useProjectStore.getState().updateClipProperties('clip-map', { mapStyle: 'dark' });
        });
        await waitFor(() => expect(tileUrls()[0]).toContain('cartocdn'));

        // 4. Change to Custom URL
        const customUrl = 'https://my-tiles.com/{z}/{x}/{y}';
        act(() => {
            useProjectStore.getState().updateClipProperties('clip-map', { mapStyle: 'custom', customMapStyleUrl: customUrl });
        });
        await waitFor(() => expect(tileUrls()[0]).toMatch(/^https:\/\/my-tiles\.com\/\d+\/\d+\/\d+$/));
    });

});
