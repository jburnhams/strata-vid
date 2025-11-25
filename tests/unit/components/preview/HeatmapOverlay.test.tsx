import React from 'react';
import { render } from '@testing-library/react';
import HeatmapOverlay from '../../../../src/components/preview/HeatmapOverlay';
import { MapContainer } from 'react-leaflet';

const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();

// Mock react-leaflet with a stable mock for append/removeChild
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  useMap: () => ({
    getPanes: () => ({
      overlayPane: {
        appendChild: mockAppendChild,
        removeChild: mockRemoveChild,
      },
    }),
    on: jest.fn(),
    off: jest.fn(),
    getBounds: () => ({ getNorthWest: () => ({ lat: 0, lng: 0 }) }),
    latLngToLayerPoint: () => ({ x: 0, y: 0 }),
    getSize: () => ({ x: 100, y: 100 }),
  }),
}));

describe('HeatmapOverlay', () => {
  beforeEach(() => {
    mockAppendChild.mockClear();
    mockRemoveChild.mockClear();
  });

  it('creates and appends a canvas to the map pane', () => {
    const { unmount } = render(
      <MapContainer>
        <HeatmapOverlay points={[]} />
      </MapContainer>
    );

    expect(mockAppendChild).toHaveBeenCalledWith(expect.any(HTMLCanvasElement));

    unmount();
    expect(mockRemoveChild).toHaveBeenCalled();
  });
});
