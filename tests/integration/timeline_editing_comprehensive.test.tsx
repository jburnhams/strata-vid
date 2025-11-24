import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TimelinePanel } from '../../src/components/TimelinePanel';
import { useProjectStore } from '../../src/store/useProjectStore';

// Mock Browser APIs
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Capture dnd callbacks
let capturedOnDragEnd: any;

// Mock dnd-kit
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  DndContext: ({ children, onDragEnd }: any) => {
    capturedOnDragEnd = onDragEnd;
    return <div>{children}</div>;
  },
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: jest.fn(),
    isOver: false,
  }),
  DragOverlay: ({ children }: any) => <div>{children}</div>,
}));

describe('Comprehensive Timeline Editing Integration', () => {
    beforeEach(() => {
        // Reset store
        useProjectStore.setState({
            tracks: {
                'track-1': {
                    id: 'track-1',
                    type: 'video',
                    label: 'Video Track 1',
                    isMuted: false,
                    isLocked: false,
                    clips: ['clip-1']
                }
            },
            clips: {
                'clip-1': {
                    id: 'clip-1',
                    assetId: 'asset-1',
                    trackId: 'track-1',
                    start: 10,
                    duration: 5,
                    offset: 0,
                    properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
                    type: 'video'
                }
            },
            assets: {
                'asset-1': {
                    id: 'asset-1',
                    name: 'test.mp4',
                    duration: 60,
                    type: 'video',
                    src: 'mock-url',
                    thumbnail: 'mock-thumb-url'
                }
            },
            trackOrder: ['track-1'],
            settings: {
                width: 1920,
                height: 1080,
                fps: 30,
                duration: 100,
                previewQuality: 'high',
                snapToGrid: true,
                allowOverlaps: false
            },
            zoomLevel: 10 // 10px per second
        });

        // Mock clientWidth
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
            configurable: true,
            get() { return 1000; }
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('displays thumbnail on clip', () => {
        render(<TimelinePanel />);
        const thumb = screen.getByTestId('clip-thumbnail');
        expect(thumb).toBeInTheDocument();
        expect(thumb).toHaveStyle({ backgroundImage: 'url(mock-thumb-url)' });
    });

    it('toggles snapping and affects drag behavior', () => {
        render(<TimelinePanel />);

        // 1. Initial State: Snapping ON
        // Move clip to 0.5s (delta -95px from 10s -> 0.5s)
        // Should snap to 0s
        act(() => {
            capturedOnDragEnd({
                active: { id: 'clip-1' },
                over: { id: 'track-1' },
                delta: { x: -95, y: 0 }
            });
        });

        expect(useProjectStore.getState().clips['clip-1'].start).toBe(0);

        // Reset clip position
        act(() => {
            useProjectStore.setState(state => {
                state.clips['clip-1'].start = 10;
            });
        });

        // 2. Toggle Snapping OFF
        const snapCheckbox = screen.getByLabelText('Snap');
        fireEvent.click(snapCheckbox);

        // Move clip to 0.5s again
        act(() => {
            capturedOnDragEnd({
                active: { id: 'clip-1' },
                over: { id: 'track-1' },
                delta: { x: -95, y: 0 }
            });
        });

        // Should NOT snap (remain 0.5s)
        expect(useProjectStore.getState().clips['clip-1'].start).toBe(0.5);
    });

    it('toggles overlap permission and affects drag behavior', () => {
        render(<TimelinePanel />);

        // Setup: Add a second clip to collide with
        act(() => {
             useProjectStore.setState(state => {
                 state.clips['clip-2'] = {
                     id: 'clip-2',
                     assetId: 'asset-1',
                     trackId: 'track-1',
                     start: 30,
                     duration: 5,
                     offset: 0,
                     properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
                     type: 'video'
                 };
                 state.tracks['track-1'].clips.push('clip-2');
             });
        });

        // 1. Initial State: Overlap OFF
        // Move clip-1 (10s) to 27s (overlaps clip-2 starting at 30s)
        // Delta = (27 - 10) * 10 = 170px
        act(() => {
            capturedOnDragEnd({
                active: { id: 'clip-1' },
                over: { id: 'track-1' },
                delta: { x: 170, y: 0 }
            });
        });

        // Should resolve to 25s (nearest valid spot before 30s)
        expect(useProjectStore.getState().clips['clip-1'].start).toBe(25);

        // Reset clip-1
        act(() => {
            useProjectStore.setState(state => {
                state.clips['clip-1'].start = 10;
            });
        });

        // 2. Toggle Overlap ON
        const overlapCheckbox = screen.getByLabelText('Overlap');
        fireEvent.click(overlapCheckbox);

        // Move to 27s again
        act(() => {
            capturedOnDragEnd({
                active: { id: 'clip-1' },
                over: { id: 'track-1' },
                delta: { x: 170, y: 0 }
            });
        });

        // Should allow 27s
        expect(useProjectStore.getState().clips['clip-1'].start).toBe(27);
    });
});
