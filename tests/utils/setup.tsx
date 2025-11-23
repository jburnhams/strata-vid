import { afterEach, beforeEach } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';
import crypto from 'crypto';
import { Canvas, Image } from '@napi-rs/canvas';

const isJSDOM = typeof window !== 'undefined';

// Patch napi-rs Canvas drawImage to tolerate JSDOM elements (like Video)
// We do this BEFORE assigning to global to ensure the class is patched
const originalGetContext = Canvas.prototype.getContext;
Object.defineProperty(Canvas.prototype, 'getContext', {
    value: function(type: string, options?: any) {
        const ctx = originalGetContext.call(this, type, options);
        if (type === '2d' && ctx) {
            // @ts-ignore
            const originalDrawImage = ctx.drawImage;
            // @ts-ignore
            ctx.drawImage = function(image: any, ...args: any[]) {
                try {
                    return originalDrawImage.call(this, image, ...args);
                } catch (e) {
                    // Ignore type errors for JSDOM elements in integration tests
                    return;
                }
            };
        }
        return ctx;
    },
    configurable: true,
    writable: true
});

// Polyfill OffscreenCanvas with @napi-rs/canvas
// @ts-ignore
global.OffscreenCanvas = Canvas;
// @ts-ignore
global.Image = Image;

// Add TextEncoder/TextDecoder to global for jsdom/node
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

if (isJSDOM) {
    // Dynamic requires for JSDOM-only modules
    require('@testing-library/jest-dom');
    const { cleanup } = require('@testing-library/react');

    // Mock window.matchMedia
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

    beforeEach(() => {
      installMatchMedia();
    });

    afterEach(() => {
      cleanup();
    });

    // Mock react-leaflet
    jest.mock('react-leaflet', () => ({
      MapContainer: ({ children }: any) => (
        <div data-testid="map-container">{children}</div>
      ),
      TileLayer: () => <div data-testid="tile-layer" />,
      Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
      Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
      useMap: () => ({
        setView: jest.fn(),
        flyTo: jest.fn(),
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

    // Mock HTMLCanvasElement.getContext (JSDOM canvas)
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
}
