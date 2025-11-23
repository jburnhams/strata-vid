
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MapPanel } from '../../../src/components/MapPanel';
import '@testing-library/jest-dom';
import { GpxPoint } from '../../../src/types';

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: ({ url }: { url: string }) => <div data-testid="tile-layer" data-url={url} />,
  Marker: ({ position }: { position: any }) => <div data-testid="marker" data-position={JSON.stringify(position)} />,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  GeoJSON: ({ data, style }: { data: any, style: any }) => <div data-testid="geojson" data-style={JSON.stringify(style)} />,
  useMap: () => ({
    fitBounds: jest.fn(),
  }),
}));

// Mock getCoordinateAtTime
jest.mock('../../../src/utils/gpxParser', () => ({
  getCoordinateAtTime: jest.fn((points, time) => {
    if (time === 1000) return { lat: 10, lon: 10 };
    if (time === 2000) return { lat: 20, lon: 20 };
    return { lat: 15, lon: 15 }; // Interpolated
  }),
}));

describe('MapPanel', () => {
  it('renders map container', () => {
    render(<MapPanel />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('renders default marker when no geoJson provided', () => {
    render(<MapPanel />);
    expect(screen.getByTestId('marker')).toBeInTheDocument();
  });

  it('renders GeoJSON when provided', () => {
    const mockGeoJson = {
      type: 'FeatureCollection',
      features: [],
    };
    render(<MapPanel geoJson={mockGeoJson as any} />);
    expect(screen.getByTestId('geojson')).toBeInTheDocument();
    // Default marker should not be present
    expect(screen.queryByText('Default Marker')).not.toBeInTheDocument();
  });

  it('renders current position marker when gpxPoints are provided', () => {
    const points: GpxPoint[] = [
      { time: 1000, lat: 10, lon: 10 },
      { time: 2000, lat: 20, lon: 20 },
    ];
    // currentTime 0, syncOffset 1000 => targetTime 1000 => lat 10, lon 10
    render(<MapPanel gpxPoints={points} currentTime={0} syncOffset={1000} />);

    const markers = screen.getAllByTestId('marker');
    expect(markers.length).toBeGreaterThanOrEqual(1);

    const currentPosMarker = markers.find(m => m.getAttribute('data-position') === JSON.stringify([10, 10]));
    expect(currentPosMarker).toBeInTheDocument();
  });

  it('applies styling properties', () => {
      const mockGeoJson = { type: 'FeatureCollection', features: [] };
      render(<MapPanel
          geoJson={mockGeoJson as any}
          mapStyle="satellite"
          trackStyle={{ color: 'red', weight: 10, opacity: 0.5 }}
      />);

      const tileLayer = screen.getByTestId('tile-layer');
      expect(tileLayer).toHaveAttribute('data-url', expect.stringContaining('arcgisonline'));

      const geoJson = screen.getByTestId('geojson');
      const style = JSON.parse(geoJson.getAttribute('data-style') || '{}');
      expect(style).toEqual({ color: 'red', weight: 10, opacity: 0.5 });
  });

  it('falls back to OSM if mapStyle is invalid', () => {
      render(<MapPanel mapStyle={'invalid' as any} />);
      const tileLayer = screen.getByTestId('tile-layer');
      expect(tileLayer).toHaveAttribute('data-url', expect.stringContaining('openstreetmap'));
  });
});
