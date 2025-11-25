import React from 'react';
import { render, act } from '@testing-library/react';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';
import '@testing-library/jest-dom';
import { Asset, Clip, Track } from '../../src/types';

// Mock usePlaybackLoop
jest.mock('../../src/hooks/usePlaybackLoop', () => ({
  usePlaybackLoop: jest.fn()
}));

// react-leaflet is mocked in setup.tsx

describe('Map Multi-Track Integration', () => {
    beforeEach(() => {
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

    it('renders multiple markers for a map clip with extra tracks', async () => {
        const gpxStartTime = 1000000;

        // Asset 1 (Primary)
        const asset1: Asset = {
            id: 'asset-1',
            name: 'track1.gpx',
            type: 'gpx',
            src: 'blob:1',
            gpxPoints: [{ time: gpxStartTime, lat: 10, lon: 10 }, { time: gpxStartTime + 1000, lat: 11, lon: 11 }],
            stats: { distance: { total: 0 }, elevation: { gain: 0, loss: 0, max: 0, min: 0, average: 0 }, time: { start: new Date(gpxStartTime), end: new Date(gpxStartTime + 1000), duration: 1000 } },
            geoJson: { type: 'FeatureCollection', features: [] }
        };

        // Asset 2 (Extra)
        const asset2: Asset = {
            id: 'asset-2',
            name: 'track2.gpx',
            type: 'gpx',
            src: 'blob:2',
            gpxPoints: [{ time: gpxStartTime, lat: 20, lon: 20 }, { time: gpxStartTime + 1000, lat: 21, lon: 21 }],
            stats: { distance: { total: 0 }, elevation: { gain: 0, loss: 0, max: 0, min: 0, average: 0 }, time: { start: new Date(gpxStartTime), end: new Date(gpxStartTime + 1000), duration: 1000 } },
            geoJson: { type: 'FeatureCollection', features: [] }
        };

        const clip: Clip = {
            id: 'clip-map',
            trackId: 'track-1',
            assetId: 'asset-1',
            start: 0,
            duration: 10,
            offset: 0,
            type: 'map',
            syncOffset: gpxStartTime,
            properties: {
                x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1,
                mapStyle: 'osm', mapZoom: 13, trackStyle: { color: 'red', weight: 3, opacity: 1 }
            },
            extraTrackAssets: [
                {
                    assetId: 'asset-2',
                    syncOffset: gpxStartTime,
                    trackStyle: { color: 'blue', weight: 3, opacity: 1 }
                }
            ]
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
                 assets: { 'asset-1': asset1, 'asset-2': asset2 },
                 clips: { 'clip-map': clip },
                 tracks: { 'track-1': track },
                 trackOrder: ['track-1'],
                 currentTime: 0,
                 selectedClipId: 'clip-map'
             });
        });

        const { findAllByTestId } = render(<App />);

        // We expect markers for both tracks
        // At t=0 (video) -> t=gpxStartTime (gpx)
        // Asset 1: (10, 10)
        // Asset 2: (20, 20)

        const markers = await findAllByTestId('marker');
        expect(markers).toHaveLength(2);

        const pos1 = markers.some(m => m.getAttribute('data-position') === JSON.stringify([10, 10]));
        const pos2 = markers.some(m => m.getAttribute('data-position') === JSON.stringify([20, 20]));

        expect(pos1).toBe(true);
        expect(pos2).toBe(true);
    });
});
