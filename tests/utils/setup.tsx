import { afterEach, beforeEach } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';
import crypto from 'crypto';
import React from 'react';
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

    // Patch HTMLVideoElement to behave like a real video in JSDOM
    const originalVideo = window.HTMLVideoElement;
    // @ts-ignore
    window.HTMLVideoElement = class extends originalVideo {
        constructor() {
            super();
            // Use setTimeout to simulate async loading
            Object.defineProperty(this, 'src', {
                set(value) {
                    this.setAttribute('src', value);
                    setTimeout(() => {
                       this.dispatchEvent(new Event('loadeddata'));
                       this.dispatchEvent(new Event('canplay'));
                       if (this.onloadeddata) this.onloadeddata(new Event('loadeddata') as any);
                       if (this.oncanplay) this.oncanplay(new Event('canplay') as any);
                    }, 10);
                },
                get() {
                    return this.getAttribute('src') || '';
                }
            });
            Object.defineProperty(this, 'currentTime', {
                set(value) {
                     this._currentTime = value;
                     setTimeout(() => {
                         this.dispatchEvent(new Event('seeked'));
                         if (this.onseeked) this.onseeked(new Event('seeked') as any);
                     }, 10);
                },
                get() {
                    return this._currentTime || 0;
                }
            });
            // Mock video properties
            Object.defineProperty(this, 'videoWidth', { get: () => 1920 });
            Object.defineProperty(this, 'videoHeight', { get: () => 1080 });
            Object.defineProperty(this, 'duration', { get: () => 10 });
        }
        play() { return Promise.resolve(); }
        pause() {}
        load() {}
    }


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
    afterEach(() => {
      cleanup();
    });

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
