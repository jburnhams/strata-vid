
/**
 * @jest-environment node
 */
// import { WorkerCompositor } from '../../../src/services/WorkerCompositor';
// We will require it dynamically to handle resetModules

// Mock dependencies
jest.mock('../../../src/services/WorkerCompositor');
jest.mock('mediabunny', () => ({
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
    ALL_FORMATS: []
}));

// Mock OffscreenCanvas
global.OffscreenCanvas = class MockOffscreenCanvas {
    width: number;
    height: number;
    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }
    getContext() {
        return {
             clearRect: jest.fn(),
             drawImage: jest.fn(),
        };
    }
} as any;

describe('exportWorker', () => {
    let mockCompositor: any;
    let originalSelf: any;
    let workerSelf: any;

    beforeEach(() => {
        jest.resetModules(); // Important to reload worker script
        originalSelf = global.self;

        workerSelf = {
            onmessage: null,
            postMessage: jest.fn(),
        };
        global.self = workerSelf;
        global.postMessage = workerSelf.postMessage;

        mockCompositor = {
            initialize: jest.fn().mockResolvedValue(undefined),
            renderFrame: jest.fn().mockResolvedValue(undefined),
            cleanup: jest.fn()
        };

        // Re-require WorkerCompositor to get the fresh mock in the new module registry
        const { WorkerCompositor } = require('../../../src/services/WorkerCompositor');
        WorkerCompositor.mockImplementation(() => mockCompositor);
    });

    afterEach(() => {
        global.self = originalSelf;
        jest.clearAllMocks();
    });

    it('handles start message and runs export loop', async () => {
        // Load the worker script
        require('../../../src/workers/exportWorker');

        expect(workerSelf.onmessage).toBeDefined();

        const payload = {
            project: {
                assets: { 'a1': { id: 'a1', type: 'video' } },
                tracks: { 't1': { id: 't1', clips: ['c1'] } },
                clips: { 'c1': { id: 'c1', start: 0, duration: 1 } },
                settings: { duration: 0.1, width: 100, height: 100 },
                trackOrder: ['t1']
            },
            exportSettings: { width: 100, height: 100, fps: 10, videoBitrate: 1000 }
        };

        // Simulate message
        await workerSelf.onmessage({ data: { type: 'start', payload } });

        // Verify initialize called
        expect(mockCompositor.initialize).toHaveBeenCalled();

        // Verify progress messages
        expect(workerSelf.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'progress', progress: expect.objectContaining({ status: 'initializing' }) }));
        expect(workerSelf.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'progress', progress: expect.objectContaining({ status: 'rendering' }) }));
        expect(workerSelf.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'progress', progress: expect.objectContaining({ status: 'encoding' }) }));

        // Verify completion
        expect(workerSelf.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', blob: expect.any(Blob) }));

        expect(mockCompositor.cleanup).toHaveBeenCalled();
    });

    it('handles cancel message', async () => {
        require('../../../src/workers/exportWorker');

        const payload = {
            project: {
                assets: {},
                tracks: {},
                clips: {},
                settings: { duration: 10, width: 100, height: 100 },
                trackOrder: []
            },
            exportSettings: { width: 100, height: 100, fps: 10 }
        };

        // Start
        const promise = workerSelf.onmessage({ data: { type: 'start', payload } });

        // Cancel immediately
        await workerSelf.onmessage({ data: { type: 'cancel' } });

        await promise;

        expect(workerSelf.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'progress', progress: expect.objectContaining({ status: 'cancelled' }) }));
    });

    it('handles errors during export', async () => {
        require('../../../src/workers/exportWorker');

        mockCompositor.initialize.mockRejectedValue(new Error('Init failed'));

        const payload = {
            project: {
                assets: {},
                settings: { duration: 1 },
                trackOrder: [] // Add this to prevent crash before initialize (though initialize is called before using it, safely)
            },
            exportSettings: { width: 100, height: 100, fps: 10 }
        };

        await workerSelf.onmessage({ data: { type: 'start', payload } });

        expect(workerSelf.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', error: 'Init failed' }));
    });
});
