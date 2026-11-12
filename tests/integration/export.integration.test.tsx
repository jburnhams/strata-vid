import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ExportModal } from '../../src/components/ExportModal';
import { useProjectStore } from '../../src/store/useProjectStore';
import type { Asset, Clip, Track } from '../../src/types';
import { createExportWorker } from '../../src/utils/workerUtils';

// Mock workerUtils
jest.mock('../../src/utils/workerUtils');

// Mock mediabunny (still needed if referenced elsewhere, but worker uses it inside)
jest.mock('mediabunny', () => {
  return {
    Output: jest.fn(),
    Mp4OutputFormat: jest.fn(),
    BufferTarget: jest.fn(),
    CanvasSource: jest.fn(),
    Input: jest.fn(),
  };
});

// Mock URL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('Export Integration Flow', () => {
    beforeEach(() => {
        jest.setTimeout(10000);
        jest.clearAllMocks();

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
        // Setup worker mock
        const mockWorker = {
             postMessage: jest.fn((msg) => {
                 if (msg.type === 'start') {
                     setTimeout(() => {
                         if (mockWorker.onmessage) {
                            mockWorker.onmessage({ data: { type: 'progress', progress: { status: 'initializing', currentFrame: 0, totalFrames: 100, percentage: 0 } } } as MessageEvent);
                            mockWorker.onmessage({ data: { type: 'progress', progress: { status: 'rendering', percentage: 50, currentFrame: 50, totalFrames: 100 } } } as MessageEvent);
                            mockWorker.onmessage({ data: { type: 'complete', blob: new Blob(['v'], {type: 'video/mp4'}), progress: { status: 'completed', percentage: 100, currentFrame: 100, totalFrames: 100 } } } as MessageEvent);
                         }
                     }, 50);
                 }
             }),
             onmessage: null,
             terminate: jest.fn(),
             onerror: null
        };
        (createExportWorker as jest.Mock).mockReturnValue(mockWorker);

        const onClose = jest.fn();
        render(<ExportModal onClose={onClose} />);

        // Check Settings UI
        expect(screen.getByRole('dialog', { name: 'Export video' })).toBeInTheDocument();

        // Change preset to 1080p
        const presetBtn = screen.getByRole('radio', { name: '1080p Full HD' });
        fireEvent.click(presetBtn);

        // Click Export
        const exportBtn = screen.getByRole('button', { name: 'Export' });

        await act(async () => {
            fireEvent.click(exportBtn);
        });

        // Progress view
        expect(screen.getByRole('dialog', { name: 'Exporting video' })).toBeInTheDocument();

        // Should finish
        await waitFor(() => {
             const error = screen.queryByText(/Error:/);
             if (error) {
                 throw new Error(`Export failed with: ${error.textContent}`);
             }
             expect(screen.getByText('Exported')).toBeInTheDocument();
        }, { timeout: 5000 });

        // jsdom has no OfflineAudioContext, so the sound cannot be mixed: the worker is told, and the
        // finished export says it has no sound (the mixing itself is in exportWithAudio's test).
        expect(mockWorker.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'start', payload: expect.objectContaining({ audioData: null, audioNote: expect.stringMatching(/^Saved without sound/) }) }),
            [],
        );
    });
});
