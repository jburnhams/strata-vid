import { afterEach, beforeEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import crypto from 'crypto';
import React from 'react';

// Add TextEncoder/TextDecoder to global for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock crypto.randomUUID
if (!global.crypto) {
    // @ts-ignore
    global.crypto = {};
}
if (!global.crypto.randomUUID) {
    global.crypto.randomUUID = () => crypto.randomUUID();
}

// Mock window.matchMedia for components that use responsive design
const installMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

installMatchMedia();

// Cleanup after each test
afterEach(() => {
  cleanup();
});

beforeEach(() => {
  installMatchMedia();
});

// Mock react-leaflet for component tests
// Enhanced mock to allow inspecting props via data attributes
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: ({ url }: { url: string }) => <div data-testid="tile-layer" data-url={url} />,
  Marker: ({ position }: { position: any }) => <div data-testid="marker" data-position={JSON.stringify(position)} />,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  GeoJSON: ({ data, style }: { data: any, style: any }) => <div data-testid="geojson" data-style={JSON.stringify(style)} />,
  useMap: () => ({
    setView: jest.fn(),
    flyTo: jest.fn(),
    fitBounds: jest.fn(),
  }),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollTo
Element.prototype.scrollTo = jest.fn();

// Mock HTMLCanvasElement.getContext
// @ts-ignore
HTMLCanvasElement.prototype.getContext = jest.fn((contextId) => {
  if (contextId === '2d') {
    return {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      drawImage: jest.fn(),
    };
  }
  return null;
});
