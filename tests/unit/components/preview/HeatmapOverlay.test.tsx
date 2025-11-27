
import React from 'react';
import { render, screen } from '@testing-library/react';
import { useMap } from 'react-leaflet';
import HeatmapOverlay from '../../../../src/components/preview/HeatmapOverlay';
import L from 'leaflet';
import { GpxPoint } from '../../../../src/types';

// Mock dependencies
jest.mock('react-leaflet', () => ({
  useMap: jest.fn(),
}));

describe('HeatmapOverlay', () => {
  let mockMap: any;
  let mockLayerInstance: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Map instance
    mockMap = {
      on: jest.fn(),
      off: jest.fn(),
      getPanes: jest.fn().mockReturnValue({ overlayPane: document.createElement('div') }),
      getSize: jest.fn().mockReturnValue({ x: 100, y: 100 }),
      containerPointToLayerPoint: jest.fn().mockReturnValue({ x: 0, y: 0 }),
      getZoomScale: jest.fn().mockReturnValue(1),
      _latLngToNewLayerPoint: jest.fn().mockReturnValue({ x: 0, y: 0 }),
      getBounds: jest.fn().mockReturnValue({ getNorthWest: jest.fn() }),
      getZoom: jest.fn().mockReturnValue(10),
      options: { zoomAnimation: true },
      latLngToContainerPoint: jest.fn().mockReturnValue({ x: 10, y: 10 }),
      removeLayer: jest.fn(),
    };

    (useMap as jest.Mock).mockReturnValue(mockMap);

    // Mock CanvasLayer instance methods
    mockLayerInstance = {
      draw: jest.fn(),
      addTo: jest.fn(),
      onAdd: jest.fn().mockReturnThis(),
      onRemove: jest.fn(),
      getCanvas: jest.fn().mockReturnValue(document.createElement('canvas')),
    };

    // Override L.canvasLayer to return our mock instance
    jest.spyOn(L, 'canvasLayer').mockReturnValue(mockLayerInstance);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const samplePoints: GpxPoint[] = [
    { time: 0, lat: 10, lon: 10, ele: 0 },
    { time: 1000, lat: 10.001, lon: 10.001, ele: 5 }, // Moving
    { time: 2000, lat: 10.002, lon: 10.002, ele: 10 },
  ];

  it('renders nothing but adds layer to map on mount', () => {
    render(<HeatmapOverlay points={samplePoints} />);

    expect(useMap).toHaveBeenCalled();
    expect(L.canvasLayer).toHaveBeenCalled();
    expect(mockLayerInstance.addTo).toHaveBeenCalledWith(mockMap);
  });

  it('removes layer from map on unmount', () => {
    const { unmount } = render(<HeatmapOverlay points={samplePoints} />);
    unmount();
    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockLayerInstance);
  });

  it('calculates speeds and draws on canvas', () => {
    render(<HeatmapOverlay points={samplePoints} />);

    // Trigger the draw function defined by the component
    expect(typeof mockLayerInstance.draw).toBe('function');

    // Create a mock canvas context
    const mockCtx = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      lineWidth: 0,
      lineCap: '',
      strokeStyle: '',
      canvas: { width: 100, height: 100 }
    };

    // Mock getCanvas to return a canvas that returns our mock context
    const mockCanvas = document.createElement('canvas');
    jest.spyOn(mockCanvas, 'getContext').mockReturnValue(mockCtx as any);
    mockLayerInstance.getCanvas.mockReturnValue(mockCanvas);

    // Call the draw method
    mockLayerInstance.draw();

    // Verification
    expect(mockCtx.clearRect).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.moveTo).toHaveBeenCalled();
    expect(mockCtx.lineTo).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('handles elevation data source', () => {
     render(<HeatmapOverlay points={samplePoints} dataSource="elevation" />);

     const mockCanvas = document.createElement('canvas');
     const mockCtx = {
        clearRect: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        canvas: { width: 100, height: 100 }
      };
      jest.spyOn(mockCanvas, 'getContext').mockReturnValue(mockCtx as any);
      mockLayerInstance.getCanvas.mockReturnValue(mockCanvas);

      mockLayerInstance.draw();
      expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('handles empty points gracefully', () => {
    render(<HeatmapOverlay points={[]} />);

    const mockCanvas = document.createElement('canvas');
     const mockCtx = {
        clearRect: jest.fn(),
        stroke: jest.fn(),
        canvas: { width: 100, height: 100 }
      };
      jest.spyOn(mockCanvas, 'getContext').mockReturnValue(mockCtx as any);
      mockLayerInstance.getCanvas.mockReturnValue(mockCanvas);

    mockLayerInstance.draw();
    expect(mockCtx.stroke).not.toHaveBeenCalled();
  });
});
