import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useProjectStore } from '../../src/store/useProjectStore';
import App from '../../src/App';
import { Clip, GpxPoint, Asset, Track } from '../../src/types';
import { act } from 'react';

// Mock Leaflet
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

const mockGpxAsset: Asset = {
  id: 'gpx1',
  name: 'track.gpx',
  type: 'gpx',
  src: 'blob:gpx1',
  gpxPoints: [
    { time: 1000, lat: 0, lon: 0, ele: 10, dist: 0 },
    { time: 2000, lat: 0, lon: 0, ele: 20, dist: 100 },
    { time: 3000, lat: 0, lon: 0, ele: 15, dist: 200 },
  ],
};

const mapClip: Clip = {
  id: 'clip1',
  assetId: 'gpx1',
  trackId: 'track1',
  start: 0,
  duration: 5,
  offset: 0,
  type: 'map',
  properties: {},
};

const track: Track = {
    id: 'track1',
    type: 'overlay',
    label: 'Map Track',
    isMuted: false,
    isLocked: false,
    clips: ['clip1']
};

describe('Section K: Advanced Map Features', () => {
  beforeEach(() => {
    act(() => {
        useProjectStore.setState({
            assets: { 'gpx1': mockGpxAsset },
            clips: { 'clip1': mapClip },
            tracks: { 'track1': track },
            trackOrder: ['track1'],
            currentTime: 0,
            selectedClipId: 'clip1',
        });
    });
  });

  it('K2: renders the ElevationProfile when a map clip with gpxPoints is active', async () => {
    render(<App />);

    act(() => {
      useProjectStore.setState({ currentTime: 1.5 });
    });

    await waitFor(() => {
      expect(screen.getByTestId('elevation-profile')).toBeInTheDocument();
    });
  });
});
