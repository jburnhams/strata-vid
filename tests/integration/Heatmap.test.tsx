
import React from 'react';
import { act, screen } from '@testing-library/react';
import { renderWithStrata as render } from 'strata-react/testing';
import { PreviewPanel } from '../../src/components/PreviewPanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import '@testing-library/jest-dom';
import type { Asset, Clip, Track } from '../../src/types';

// Mock usePlaybackLoop
jest.mock('../../src/hooks/usePlaybackLoop', () => ({
  usePlaybackLoop: jest.fn()
}));

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

    it('colours the route by speed, with a key, when the heatmap is on', async () => {
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

        render(<PreviewPanel />);

        // RouteMap colours the route in steps and names them in its key.
        expect(await screen.findByText('Speed')).toBeInTheDocument();
    });

    it('colours by speed when the heatmap is switched on before a reading is chosen', async () => {
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
                heatmap: { enabled: true }
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

        // RouteMap colours the route in steps and names them in its key.
        expect(await screen.findByText('Speed')).toBeInTheDocument();
    });
});
