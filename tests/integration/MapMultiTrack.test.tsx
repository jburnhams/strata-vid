import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { renderWithStrata as render } from 'strata-react/testing';
import { mapText, showsTileOf } from '../utils/mapProbe';
import { PreviewPanel } from '../../src/components/PreviewPanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import '@testing-library/jest-dom';
import type { Asset, Clip, Track } from '../../src/types';

// Mock usePlaybackLoop
jest.mock('../../src/hooks/usePlaybackLoop', () => ({
  usePlaybackLoop: jest.fn()
}));

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
                 currentTime: 0
             });
        });

        render(<PreviewPanel />);

        // A runner on each route, named in the map's text; the view holds the first one, as the export does.
        await waitFor(() => expect(mapText()).toMatch(/track1\.gpx: 0\sm along/));
        expect(mapText()).toMatch(/track2\.gpx: 0\sm along/);
        expect(showsTileOf(10, 10)).toBe(true);
    });
});
