import React from 'react';
import { render, screen } from '@testing-library/react';
import { MapPanel, MapTrackData } from '../../../src/components/MapPanel';
import '@testing-library/jest-dom';
import { GpxPoint } from '../../../src/types';

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: ({ url }: { url: string }) => <div data-testid="tile-layer" data-url={url} />,
  Marker: ({ position, icon }: { position: any, icon: any }) => (
      <div data-testid="marker" data-position={JSON.stringify(position)} data-icon={icon ? 'custom' : 'default'} />
  ),
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  GeoJSON: ({ data, style }: { data: any, style: any }) => <div data-testid="geojson" data-style={JSON.stringify(style)} />,
  useMap: () => ({
    fitBounds: jest.fn(),
  }),
}));

// Mock getCoordinateAtTime
jest.mock('../../../src/utils/gpxParser', () => ({
  getCoordinateAtTime: jest.fn((points, time) => {
    // Mock implementation returning different values based on input length
    if (points.length === 2) return { lat: 10, lon: 10 }; // Track 1
    if (points.length === 3) return { lat: 20, lon: 20 }; // Track 2
    return { lat: 0, lon: 0 };
  }),
}));

describe('MapPanel Multi-Track', () => {
    it('renders multiple tracks', () => {
        const track1: MapTrackData = {
            gpxPoints: [{ time: 0, lat: 0, lon: 0 }, { time: 1000, lat: 10, lon: 10 }] as GpxPoint[], // length 2
            syncOffset: 0,
            trackStyle: { color: 'red', weight: 4, opacity: 1 },
            geoJson: { type: 'FeatureCollection', features: [] }
        };
        const track2: MapTrackData = {
            gpxPoints: [{ time: 0, lat: 0, lon: 0 }, { time: 1000, lat: 20, lon: 20 }, { time: 2000, lat: 30, lon: 30 }] as GpxPoint[], // length 3
            syncOffset: 0,
            trackStyle: { color: 'blue', weight: 3, opacity: 0.8 },
            geoJson: { type: 'FeatureCollection', features: [] }
        };

        render(<MapPanel tracks={[track1, track2]} currentTime={0} />);

        const geojsons = screen.getAllByTestId('geojson');
        expect(geojsons).toHaveLength(2);

        const style1 = JSON.parse(geojsons[0].getAttribute('data-style') || '{}');
        expect(style1.color).toBe('red');

        const style2 = JSON.parse(geojsons[1].getAttribute('data-style') || '{}');
        expect(style2.color).toBe('blue');

        const markers = screen.getAllByTestId('marker');
        expect(markers).toHaveLength(2);
    });
});
