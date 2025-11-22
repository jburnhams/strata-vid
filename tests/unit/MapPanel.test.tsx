import React from 'react';
import { render } from '@testing-library/react';
import { MapPanel } from '../../src/components/MapPanel';

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div>MapContainer {children}</div>,
  TileLayer: () => <div>TileLayer</div>,
  Marker: () => <div>Marker</div>,
  Popup: () => <div>Popup</div>,
  GeoJSON: () => <div>GeoJSON</div>,
  useMap: () => ({ fitBounds: jest.fn() })
}));

// Mock leaflet
jest.mock('leaflet', () => ({
  icon: jest.fn(),
  Marker: { prototype: { options: {} } },
  GeoJSON: jest.fn().mockImplementation(() => ({
      getBounds: jest.fn().mockReturnValue({ isValid: () => true })
  }))
}));

describe('MapPanel', () => {
  it('renders default map without geoJson', () => {
    const { getByText } = render(<MapPanel />);
    expect(getByText('MapContainer')).toBeInTheDocument();
    expect(getByText('Marker')).toBeInTheDocument();
  });

  it('renders geoJson when provided', () => {
    const mockGeoJson: any = { type: 'FeatureCollection', features: [] };
    const { getByText, queryByText } = render(<MapPanel geoJson={mockGeoJson} />);

    expect(getByText('GeoJSON')).toBeInTheDocument();
    // Should not show default marker
    expect(queryByText('Marker')).not.toBeInTheDocument();
  });
});
