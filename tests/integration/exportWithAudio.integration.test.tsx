import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ExportModal } from '../../src/components/ExportModal';
import { useProjectStore } from '../../src/store/useProjectStore';
import { Asset, Clip, Track } from '../../src/types';
import { createExportWorker } from '../../src/utils/workerUtils';
import { AudioCompositor } from '../../src/services/AudioCompositor';

// Mock workerUtils
jest.mock('../../src/utils/workerUtils');

// Mock AudioCompositor
const mockRender = jest.fn().mockResolvedValue({
    numberOfChannels: 2,
    sampleRate: 44100,
    getChannelData: jest.fn().mockReturnValue(new Float32Array(100))
});

jest.mock('../../src/services/AudioCompositor', () => {
    return {
        AudioCompositor: jest.fn().mockImplementation(() => ({
            render: mockRender
        }))
    };
});

// Mock mediabunny
jest.mock('mediabunny', () => {
  return {
    Output: jest.fn(),
    Mp4OutputFormat: jest.fn(),
    BufferTarget: jest.fn(),
    CanvasSource: jest.fn(),
    Input: jest.fn(),
    BlobSource: jest.fn(),
  };
});

// Mock URL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('Export with Audio Integration', () => {
    beforeEach(() => {
        jest.setTimeout(10000);
        jest.clearAllMocks();
        mockRender.mockClear();

        // Reset store
        useProjectStore.setState({
            id: 'test-project',
            settings: { width: 1280, height: 720, fps: 30, duration: 0.5, previewQuality: 'high', snapToGrid: true, allowOverlaps: true, simplificationTolerance: 0.0001 },
            assets: {
                'a1': { id: 'a1', type: 'video', src: 'test.mp4', name: 'Test Video', duration: 10 } as Asset,
                'a2': { id: 'a2', type: 'audio', src: 'music.mp3', name: 'Music', duration: 10 } as Asset
            },
            tracks: {
                't1': { id: 't1', type: 'video', label: 'Video 1', isMuted: false, isLocked: false, clips: ['c1'], volume: 1 } as Track,
                't2': { id: 't2', type: 'audio', label: 'Music', isMuted: false, isLocked: false, clips: ['c2'], volume: 1 } as Track
            },
            clips: {
                'c1': { id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 0.5, offset: 0, properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }, type: 'video', volume: 1 } as Clip,
                'c2': { id: 'c2', assetId: 'a2', trackId: 't2', start: 0, duration: 0.5, offset: 0, properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }, type: 'audio', volume: 1 } as Clip
            },
            trackOrder: ['t1', 't2'],
            currentTime: 0,
            isPlaying: false,
            playbackRate: 1,
            selectedAssetId: null,
        } as any);

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

    it('should pass audio data to export worker', async () => {
        // Setup worker mock
        const mockPostMessage = jest.fn();
        const mockWorker = {
             postMessage: mockPostMessage,
             onmessage: null,
             terminate: jest.fn(),
             onerror: null
        };
        (createExportWorker as jest.Mock).mockReturnValue(mockWorker);

        // Auto trigger worker responses to simulate progress
        mockPostMessage.mockImplementation((msg) => {
             if (msg.type === 'start') {
                 setTimeout(() => {
                     if (mockWorker.onmessage) {
                        mockWorker.onmessage({ data: { type: 'progress', progress: { status: 'initializing', currentFrame: 0, totalFrames: 100, percentage: 0 } } } as MessageEvent);
                        mockWorker.onmessage({ data: { type: 'progress', progress: { status: 'rendering', percentage: 50, currentFrame: 50, totalFrames: 100 } } } as MessageEvent);
                        mockWorker.onmessage({ data: { type: 'complete', blob: new Blob(['v'], {type: 'video/mp4'}), progress: { status: 'completed', percentage: 100, currentFrame: 100, totalFrames: 100 } } } as MessageEvent);
                     }
                 }, 50);
             }
        });

        const onClose = jest.fn();
        render(<ExportModal onClose={onClose} />);

        // Wait for rendering
        expect(screen.getByText('Start Export')).toBeInTheDocument();

        // Click Export
        await act(async () => {
            fireEvent.click(screen.getByText('Start Export'));
        });

        // Verify AudioCompositor was used
        expect(AudioCompositor).toHaveBeenCalled();
        expect(mockRender).toHaveBeenCalled();

        // Verify worker payload contains audio data
        await waitFor(() => {
             expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
                 type: 'start',
                 payload: expect.objectContaining({
                     audioData: expect.objectContaining({
                         channels: expect.any(Array),
                         sampleRate: 44100
                     })
                 })
             }), expect.any(Array)); // Second arg is transferables
        });

        // Wait for completion
        await waitFor(() => {
             expect(screen.getByText('Export Complete!')).toBeInTheDocument();
        });
    });
});
