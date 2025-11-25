import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';
import { mockGpxAsset, mockMapClip } from '../utils/mockData';
import { act } from 'react';

// Mocking dnd-kit for JSDOM
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  DndContext: ({ children }) => <div>{children}</div>,
}));

// Mocking react-leaflet for JSDOM
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ position, children }) => (
    <div data-testid="marker" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  GeoJSON: ({ data }) => <div data-testid="geojson" data-geojson={JSON.stringify(data)} />,
  useMap: () => ({
    fitBounds: jest.fn(),
  }),
}));

describe('Elevation Profile Integration Test', () => {
  beforeEach(() => {
    act(() => {
      const initialState = useProjectStore.getState();
      useProjectStore.setState({
        ...initialState,
        tracks: { 'track-1': { id: 'track-1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [mockMapClip.id] } },
        clips: { [mockMapClip.id]: { ...mockMapClip, properties: { ...mockMapClip.properties, showElevationProfile: false } } },
        trackOrder: ['track-1'],
        selectedClipId: mockMapClip.id,
        assets: { [mockGpxAsset.id]: mockGpxAsset },
      }, true);
    });
  });

  it('should display the elevation profile when the clip property is enabled', async () => {
    render(<App />);

    const checkbox = await screen.findByTestId('show-elevation-checkbox');
    fireEvent.click(checkbox);

    await waitFor(() => {
      const clip = useProjectStore.getState().clips[mockMapClip.id];
      expect(clip.properties.showElevationProfile).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByTestId('elevation-profile')).toBeInTheDocument();
    });

    fireEvent.click(checkbox);
    await waitFor(() => {
      const clip = useProjectStore.getState().clips[mockMapClip.id];
      expect(clip.properties.showElevationProfile).toBe(false);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('elevation-profile')).not.toBeInTheDocument();
    });
  });
});
