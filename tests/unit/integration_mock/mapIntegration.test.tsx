
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MapPanel } from '../../../src/components/MapPanel';
import { MapSyncControl } from '../../../src/components/MapSyncControl';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { GpxPoint, Asset, Clip } from '../../../src/types';
import '@testing-library/jest-dom';

// Import fireEvent for the test
import { fireEvent } from '@testing-library/react';

// Mock react-leaflet to avoid canvas issues in JSDOM
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ position }: { position: any }) => <div data-testid="marker" data-position={JSON.stringify(position)} />,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  GeoJSON: ({ data }: { data: any }) => <div data-testid="geojson" />,
  useMap: () => ({
    fitBounds: jest.fn(),
  }),
}));

// Real store is used, but we need to mock gpxParser because we can't parse real files easily in JSDOM
// However, we are testing the integration of components with data, so we can just construct data manually.

describe('Map Integration', () => {
  // Setup store with initial state
  const points: GpxPoint[] = [
    { time: 1000, lat: 10, lon: 10 },
    { time: 2000, lat: 20, lon: 20 },
    { time: 3000, lat: 30, lon: 30 },
  ];

  const asset: Asset = {
    id: 'asset-1',
    name: 'test.gpx',
    type: 'gpx',
    src: 'blob:url',
    gpxPoints: points,
    stats: {
      time: { start: new Date(1000), end: new Date(3000), duration: 2000 },
      distance: { total: 100 },
      elevation: { gain: 0, loss: 0, max: 0, min: 0, average: 0 }
    }
  };

  const clip: Clip = {
    id: 'clip-1',
    assetId: 'asset-1',
    trackId: 'track-1',
    start: 0,
    duration: 10,
    offset: 0,
    type: 'map',
    properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 },
    syncOffset: 0,
  };

  beforeEach(() => {
    act(() => {
      useProjectStore.setState({
        assets: { 'asset-1': asset },
        clips: { 'clip-1': clip },
        tracks: { 'track-1': { id: 'track-1', type: 'overlay', clips: ['clip-1'], isMuted: false, isLocked: false, label: 'Map' } },
        currentTime: 0,
      });
    });
  });

  it('updates map marker position based on sync offset and current time', () => {
    // Render components
    // Scenario:
    // Video is at 0s.
    // Sync Offset is 0. MapPanel defaults to using the first point's time (1000ms) as base if offset is 0.
    // BaseTime = 1000ms.
    // TargetTime = BaseTime + CurrentTime(0) = 1000ms.
    // Point at 1000ms is (10, 10).

    const { rerender } = render(
      <MapPanel
        gpxPoints={asset.gpxPoints}
        currentTime={0}
        syncOffset={0}
      />
    );

    let markers = screen.getAllByTestId('marker');
    // Find the marker with correct position
    let marker = markers.find(m => m.getAttribute('data-position') === JSON.stringify([10, 10]));
    expect(marker).toBeInTheDocument();

    // Move time to 1s (Video Time).
    // TargetTime = 1000ms (Base) + 1000ms (Video) = 2000ms.
    // Point at 2000ms is (20, 20).
    rerender(<MapPanel gpxPoints={asset.gpxPoints} currentTime={1} syncOffset={0} />);

    markers = screen.getAllByTestId('marker');
    marker = markers.find(m => m.getAttribute('data-position') === JSON.stringify([20, 20]));
    expect(marker).toBeInTheDocument();

    // Move time to 2s.
    // TargetTime = 1000ms (Base) + 2000ms (Video) = 3000ms.
    // Point at 3000ms is (30, 30).
    rerender(<MapPanel gpxPoints={asset.gpxPoints} currentTime={2} syncOffset={0} />);

    markers = screen.getAllByTestId('marker');
    marker = markers.find(m => m.getAttribute('data-position') === JSON.stringify([30, 30]));
    expect(marker).toBeInTheDocument();

    // Now, let's change the Sync Offset using the Control.
    render(<MapSyncControl clipId="clip-1" />);

    // Initially input shows '0'.
    // We set Sync Offset to 2000ms.
    // This means Video Time 0 corresponds to GPX Time 2000ms.

    const input = screen.getByDisplayValue('0');
    fireEvent.change(input, { target: { value: '2000' } });
    fireEvent.click(screen.getByText('Set'));

    // Verify store update
    expect(useProjectStore.getState().clips['clip-1'].syncOffset).toBe(2000);

    // Rerender MapPanel with new offset from store
    const newOffset = useProjectStore.getState().clips['clip-1'].syncOffset!;

    // We are at Video Time 1s (from previous rerender state of 'currentTime' in our test logic flow, though strictly we pass it as prop)
    // Let's pass currentTime = 1.
    // BaseTime = 2000ms.
    // TargetTime = 2000ms + 1000ms = 3000ms.
    // Point at 3000ms is (30, 30).
    rerender(<MapPanel gpxPoints={asset.gpxPoints} currentTime={1} syncOffset={newOffset} />);

    markers = screen.getAllByTestId('marker');
    marker = markers.find(m => m.getAttribute('data-position') === JSON.stringify([30, 30]));

    if (!marker) {
       console.log('Markers found:', markers.map(m => m.getAttribute('data-position')));
    }
    expect(marker).toBeInTheDocument();
  });
});
