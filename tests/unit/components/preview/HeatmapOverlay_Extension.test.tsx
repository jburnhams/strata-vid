import React from 'react';
import { render } from '@testing-library/react';

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  useMap: jest.fn(),
}));

// Mock leaflet
jest.mock('leaflet', () => {
  const L: any = {};

  class Layer {
     static extend(props: any) {
         const NewClass = function(this: any) {
             Object.assign(this, props);
         };
         return NewClass;
     }
  }
  L.Layer = Layer;

  L.DomUtil = {
      create: jest.fn(() => ({
          getContext: jest.fn(),
          style: {},
          width: 0,
          height: 0,
          tagName: 'CANVAS'
      })),
      remove: jest.fn(),
      setPosition: jest.fn(),
      setTransform: jest.fn(),
  };

  L.Browser = { any3d: true };
  L.canvasLayer = null;

  return {
      __esModule: true,
      default: L,
      ...L
  };
});

describe('HeatmapOverlay Leaflet Extension', () => {
   it('defines L.CanvasLayer and implements methods correctly', () => {
       jest.isolateModules(() => {
           // Require L and the component to ensure side effects run in this isolated context
           // We need to handle potential ES module default export structure
           const leafletModule = require('leaflet');
           const L = leafletModule.default || leafletModule;

           // Import component to trigger side effects
           require('../../../../src/components/preview/HeatmapOverlay');

           expect(typeof L.canvasLayer).toBe('function');

           const layer = L.canvasLayer();

           const mapMock: any = {
               getPanes: jest.fn(() => ({
                   overlayPane: { appendChild: jest.fn() }
               })),
               getSize: jest.fn(() => ({ x: 100, y: 100 })),
               on: jest.fn(),
               off: jest.fn(),
               options: { zoomAnimation: true },
               containerPointToLayerPoint: jest.fn(() => ({ x: 0, y: 0 })),
               getZoomScale: jest.fn(() => 1),
               _latLngToNewLayerPoint: jest.fn(() => ({ x: 0, y: 0 })),
               getBounds: jest.fn(() => ({ getNorthWest: jest.fn() })),
               getZoom: jest.fn(() => 10),
           };

           layer.draw = jest.fn();

           layer.onAdd(mapMock);

           expect(layer._map).toBe(mapMock);
           expect(L.DomUtil.create).toHaveBeenCalledWith('canvas', 'leaflet-heatmap-layer');
           expect(mapMock.getPanes).toHaveBeenCalled();
           expect(mapMock.on).toHaveBeenCalled();

           expect(L.DomUtil.setPosition).toHaveBeenCalled();
           expect(layer.draw).toHaveBeenCalled();

           const zoomEvent = { zoom: 12, center: {} };
           layer._animateZoom(zoomEvent);
           expect(mapMock.getZoomScale).toHaveBeenCalled();
           expect(L.DomUtil.setTransform).toHaveBeenCalled();

           expect(layer.getCanvas()).toBe(layer._canvas);

           layer.onRemove(mapMock);
           expect(L.DomUtil.remove).toHaveBeenCalled();
       });
   });
});
