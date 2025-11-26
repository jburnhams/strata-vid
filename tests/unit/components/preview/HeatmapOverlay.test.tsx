
import React from 'react';
import { render } from '@testing-library/react';
import HeatmapOverlay from '../../../../src/components/preview/HeatmapOverlay';
import { GpxPoint } from '../../../../src/types';

// Mock the 'react-leaflet' module.
const mockMap = {
  on: jest.fn(),
  off: jest.fn(),
  removeLayer: jest.fn(),
  latLngToContainerPoint: jest.fn((latlng: [number, number]) => ({ x: latlng[0] * 10, y: latlng[1] * 10 })),
  getSize: () => ({ x: 1000, y: 1000 }),
  getPanes: () => ({ overlayPane: { appendChild: jest.fn() } }),
  containerPointToLayerPoint: () => ({ x: 0, y: 0 }),
  options: { zoomAnimation: false },
};

jest.mock('react-leaflet', () => ({
  useMap: () => mockMap,
}));

// Mock leaflet
jest.mock('leaflet', () => {
    const originalLeaflet = jest.requireActual('leaflet');
    return {
        ...originalLeaflet,
        canvasLayer: jest.fn(() => ({
            addTo: jest.fn(),
        })),
        Layer: {
            extend: jest.fn(() => (function() {})),
        },
        DomUtil: {
            ...originalLeaflet.DomUtil,
            create: jest.fn(() => ({
                getContext: jest.fn(() => ({
                    clearRect: jest.fn(),
                }))
            })),
            setPosition: jest.fn(),
            remove: jest.fn(),
        },
    };
});


const samplePoints: GpxPoint[] = [
    { lat: 10, lon: 10, ele: 100, time: 1640995200000 },
    { lat: 10.01, lon: 10.01, ele: 110, time: 1640995260000 },
];

describe('HeatmapOverlay', () => {
    it('should render without crashing', () => {
        const { container } = render(<HeatmapOverlay points={samplePoints} />);
        expect(container).toBeDefined();
    });
});
