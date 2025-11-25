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
      // Set a complete, self-contained, valid state for this specific test
      useProjectStore.setState({
        // Project Slice
        id: 'test-project',
        settings: {
          width: 1920,
          height: 1080,
          fps: 30,
          duration: 30,
          previewQuality: 'high',
          snapToGrid: true,
          allowOverlaps: false,
          simplificationTolerance: 0.0001,
        },
        // Timeline Slice
        tracks: { 'track-1': { id: 'track-1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [mockMapClip.id] } },
        clips: { [mockMapClip.id]: { ...mockMapClip, properties: { ...mockMapClip.properties, showElevationProfile: false } } },
        trackOrder: ['track-1'],
        markers: [],
        selectedClipId: mockMapClip.id,
        // Assets Slice
        assets: { [mockGpxAsset.id]: mockGpxAsset },
        selectedAssetId: null,
        // Playback Slice
        currentTime: 0,
        isPlaying: false,
        playbackRate: 1,
        // UI Slice
        isLoading: false,
        loadingMessage: null,
        toasts: [],
      }, true); // Use true to replace the state entirely
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
