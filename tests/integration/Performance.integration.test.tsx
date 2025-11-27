import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { TimelinePanel } from '../../src/components/TimelinePanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import { Track, Clip } from '../../src/types';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Mock dnd-kit to avoid complex drag logic in this test
jest.mock('@dnd-kit/core', () => ({
    ...jest.requireActual('@dnd-kit/core'),
    DndContext: ({ children }: any) => <div>{children}</div>,
    DragOverlay: () => null,
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
}));

describe('Performance Integration (Section J)', () => {
    beforeEach(() => {
        act(() => {
            useProjectStore.setState({
                tracks: {},
                clips: {},
                assets: {},
                trackOrder: [],
                zoomLevel: 10,
                currentTime: 0
            });
        });

        // Mock clientWidth for virtualization calculation
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
            configurable: true,
            value: 1000,
        });
        Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
            configurable: true,
            value: 0,
            writable: true
        });
    });

    it('J1: Virtualization - renders only visible clips from a large dataset', async () => {
        // Create 100 clips
        const clips: Record<string, Clip> = {};
        const trackId = 'track-1';
        const clipIds: string[] = [];

        for (let i = 0; i < 100; i++) {
            const id = `clip-${i}`;
            clips[id] = {
                id,
                trackId,
                assetId: 'asset-1',
                start: i * 10, // 0, 10, 20...
                duration: 10, // 10s
                offset: 0,
                type: 'video',
                properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 }
            };
            clipIds.push(id);
        }

        const track: Track = {
            id: trackId,
            type: 'video',
            label: 'Main Track',
            clips: clipIds,
            isMuted: false,
            isLocked: false
        };

        act(() => {
            useProjectStore.setState({
                tracks: { [trackId]: track },
                clips,
                trackOrder: [trackId],
                zoomLevel: 10, // 10px per second
            });
        });

        render(<TimelinePanel />);

        // With zoomLevel 10, 1 second = 10px.
        // Container width = 1000px (mocked) = 100 seconds visible.
        // Plus buffer (500px / 10 = 50s).
        // So roughly 150s visible range.

        // Clip 0 starts at 0s. Visible.
        expect(screen.getByTestId('clip-item-clip-0')).toBeInTheDocument();

        // Clip 10 starts at 100s. Visible.
        expect(screen.getByTestId('clip-item-clip-10')).toBeInTheDocument();

        // Clip 50 starts at 500s. Should NOT be visible.
        expect(screen.queryByTestId('clip-item-clip-50')).not.toBeInTheDocument();

        // Clip 99 starts at 990s. Should NOT be visible.
        expect(screen.queryByTestId('clip-item-clip-99')).not.toBeInTheDocument();
    });
});
