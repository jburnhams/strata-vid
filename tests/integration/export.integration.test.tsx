import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ExportModal } from '../../src/components/ExportModal';
import { useProjectStore } from '../../src/store/useProjectStore';
import { Asset, Clip, Track } from '../../src/types';
import * as mediabunny from 'mediabunny';

// Mock mediabunny
jest.mock('mediabunny', () => {
  return {
    Output: jest.fn().mockImplementation(() => ({
      addVideoTrack: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined),
      finalize: jest.fn().mockResolvedValue(undefined),
      target: { buffer: new ArrayBuffer(8) }
    })),
    Mp4OutputFormat: jest.fn(),
    BufferTarget: jest.fn(),
    CanvasSource: jest.fn().mockImplementation(() => ({
        addFrame: jest.fn().mockResolvedValue(undefined),
        add: jest.fn().mockResolvedValue(undefined)
    })),
    Input: jest.fn(),
    FilePathSource: jest.fn(),
    MP4: {},
  };
});

// Mock URL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('Export Integration Flow', () => {
    beforeAll(() => {
        // Create a FakeVideo class that extends napi-rs Image (global.Image)
        // so it passes type checks in drawImage, but has Video methods.
        const NapiImage = global.Image;

        class FakeVideo extends NapiImage {
            _currentTime = 0;
            _listeners: Record<string, Function[]> = {};
            src = '';
            muted = false;
            playsInline = false;
            crossOrigin = null;

            constructor() {
                super();
            }

            get currentTime() { return this._currentTime; }
            set currentTime(v: number) {
                this._currentTime = v;
                // Trigger seeked async
                setTimeout(() => {
                    this.dispatchEvent(new Event('seeked'));
                }, 0);
            }

            addEventListener(type: string, listener: Function, options?: any) {
                if (!this._listeners[type]) this._listeners[type] = [];
                this._listeners[type].push(listener);
            }

            removeEventListener(type: string, listener: Function) {
                if (this._listeners[type]) {
                    this._listeners[type] = this._listeners[type].filter(l => l !== listener);
                }
            }

            dispatchEvent(event: Event) {
                const ls = this._listeners[event.type] || [];
                ls.forEach(l => l(event));
                return true;
            }

            play() {}
            pause() {}
            load() {}
            remove() {}
        }

        // Mock document.createElement to return FakeVideo for 'video'
        const originalCreateElement = document.createElement.bind(document);
        jest.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: any) => {
            if (tagName === 'video') {
                return new FakeVideo() as any;
            }
            return originalCreateElement(tagName, options);
        });
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    beforeEach(() => {
        jest.setTimeout(30000);

        // Reset store
        useProjectStore.setState({
            id: 'test-project',
            settings: { width: 1280, height: 720, fps: 30, duration: 0.5, previewQuality: 'high' },
            assets: {
                'a1': { id: 'a1', type: 'video', src: 'test.mp4', name: 'Test Video', duration: 10 } as Asset
            },
            tracks: {
                't1': { id: 't1', type: 'video', label: 'Video 1', isMuted: false, isLocked: false, clips: ['c1'] } as Track
            },
            clips: {
                'c1': { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 0.5, offset: 0, properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }, type: 'video' } as Clip
            },
            trackOrder: ['t1'],
            currentTime: 0,
            isPlaying: false,
            playbackRate: 1,
            selectedAssetId: null
        });

        // Mock VideoEncoder global
        global.VideoEncoder = class {
            configure() {}
            encode() {}
            close() {}
            flush() { return Promise.resolve(); }
            state = 'configured';
            reset() {}
            ondequeue = null;
            isConfigured = true;
        } as any;
    });

    it('should perform full export flow with settings change', async () => {
        const onClose = jest.fn();
        render(<ExportModal onClose={onClose} />);

        // Check Settings UI
        expect(screen.getByText('Export Settings')).toBeInTheDocument();

        // Change preset to 1080p
        const presetBtn = screen.getByText('1080p Full HD');
        fireEvent.click(presetBtn);

        // Click Export
        const exportBtn = screen.getByText('Start Export');

        await act(async () => {
            fireEvent.click(exportBtn);
        });

        // Progress view
        expect(screen.getByText('Exporting Project')).toBeInTheDocument();

        // Should finish
        await waitFor(() => {
             const error = screen.queryByText(/Error:/);
             if (error) {
                 throw new Error(`Export failed with: ${error.textContent}`);
             }
             expect(screen.getByText('Export Complete!')).toBeInTheDocument();
        }, { timeout: 10000 });
    }, 30000);
});
