import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';

// Mock Browser APIs
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
global.URL.createObjectURL = jest.fn(() => 'mock-url');

// Mock components/hooks that might interfere
jest.mock('../../src/hooks/useAutoSave', () => ({
    useAutoSave: jest.fn()
}));

// Mock mediabunny just in case
jest.mock('mediabunny', () => ({
    Input: class {},
    Output: class {}
}));

describe('Section B: Timeline Editing Integration', () => {
    beforeEach(() => {
        // Reset store and populate with test data
        useProjectStore.setState({
            assets: {
                'asset-1': { id: 'asset-1', name: 'video.mp4', type: 'video', duration: 100, src: 'mock-url', file: new File([], 'v.mp4') }
            },
            tracks: {
                'track-1': { id: 'track-1', type: 'video', label: 'Video Track', isMuted: false, isLocked: false, clips: ['clip-1'] }
            },
            clips: {
                'clip-1': {
                    id: 'clip-1',
                    assetId: 'asset-1',
                    trackId: 'track-1',
                    start: 10,
                    duration: 10,
                    offset: 0,
                    properties: { x: 0, y: 0, width: 1, height: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    type: 'video'
                }
            },
            trackOrder: ['track-1'],
            currentTime: 0,
            zoomLevel: 10 // 10px per second
        });
    });

    it('updates clip duration and tooltip when resizing via handles', () => {
        render(<App />);

        // Find the clip. The clip renders its ID text.
        const clipText = screen.getByText('clip-1');

        // Locate the right resize handle.
        // We look for the sibling div with cursor-e-resize class.
        // The structure is <div><span>text</span><div>handleL</div><div>handleR</div></div>
        const clipContainer = clipText.closest('div');
        const handles = clipContainer?.querySelectorAll('div.cursor-e-resize');
        const rightHandle = handles?.[0];

        if (!rightHandle) throw new Error('Right resize handle not found');

        // Simulate Resize
        // 1. Pointer Down
        fireEvent(rightHandle, new MouseEvent('pointerdown', { bubbles: true, clientX: 200 }));

        // 2. Pointer Move (Window) - move +20px => +2 seconds (at zoom 10)
        fireEvent(window, new MouseEvent('pointermove', { bubbles: true, clientX: 220 }));

        // Check Tooltip
        expect(screen.getByTestId('resize-tooltip')).toBeInTheDocument();
        expect(screen.getByText(/End:/)).toBeInTheDocument();

        // 3. Pointer Up (Window)
        fireEvent(window, new MouseEvent('pointerup', { bubbles: true }));

        // Verify Store Update
        const state = useProjectStore.getState();
        expect(state.clips['clip-1'].duration).toBe(12); // 10 + 2 = 12
    });

    // Note: Full drag-and-drop integration with @dnd-kit in JSDOM is extremely brittle
    // and usually requires mocking the sensors or DndContext itself, which we did in unit tests.
    // In this integration test, we verify the resizing interaction which uses custom pointer events.
});
