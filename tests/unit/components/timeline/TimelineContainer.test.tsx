import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TimelineContainer } from '../../../../src/components/timeline/TimelineContainer';
import { Track, Clip } from '../../../../src/types';

// Capture dnd callbacks
let capturedOnDragEnd: any;
let capturedOnDragMove: any;
let capturedOnDragStart: any;

// Mock dnd-kit
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  DndContext: ({ children, onDragEnd, onDragMove, onDragStart }: any) => {
    capturedOnDragEnd = onDragEnd;
    capturedOnDragMove = onDragMove;
    capturedOnDragStart = onDragStart;
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

// Mock TrackLane to simulate resize events from children
jest.mock('../../../../src/components/timeline/TrackLane', () => ({
  TrackLane: ({ onClipResize, onContextMenu, clips }: any) => (
    <div data-testid="track-lane">
      {clips.map((clip: any) => (
        <div key={clip.id}>
            <button
            data-testid={`resize-btn-${clip.id}`}
            onClick={() => onClipResize(clip.id, 20, 10, 5)}
            >
            Resize {clip.id}
            </button>
            <button
            data-testid={`context-btn-${clip.id}`}
            onClick={(e) => onContextMenu(e, clip.id)}
            >
            Context {clip.id}
            </button>
        </div>
      ))}
    </div>
  ),
}));

const mockTracks: Record<string, Track> = {
  'track-1': {
    id: 'track-1',
    type: 'video',
    label: 'Video Track',
    isMuted: false,
    isLocked: false,
    clips: ['clip-1', 'clip-2'],
  },
};

const mockClips: Record<string, Clip> = {
  'clip-1': {
    id: 'clip-1',
    assetId: 'asset-1',
    trackId: 'track-1',
    start: 10,
    duration: 5,
    offset: 0,
    properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 },
    type: 'video',
  },
  'clip-2': {
    id: 'clip-2',
    assetId: 'asset-1',
    trackId: 'track-1',
    start: 30, // Far enough away
    duration: 5,
    offset: 0,
    properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 },
    type: 'video',
  },
};

describe('TimelineContainer', () => {
  const defaultProps = {
    tracks: mockTracks,
    clips: mockClips,
    trackOrder: ['track-1'],
    zoomLevel: 10,
    setZoomLevel: jest.fn(),
    onMoveClip: jest.fn(),
    onResizeClip: jest.fn(),
    onRemoveTrack: jest.fn(),
    onRemoveClip: jest.fn(),
    onDuplicateClip: jest.fn(),
    onAddTrack: jest.fn(),
    selectedClipId: null,
    onClipSelect: jest.fn(),
    currentTime: 0,
    isPlaying: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tracks and clips', () => {
    render(<TimelineContainer {...defaultProps} />);
    expect(screen.getByText('Video Track')).toBeInTheDocument();
    // Because we mocked TrackLane, we check for our mock buttons
    expect(screen.getByTestId('resize-btn-clip-1')).toBeInTheDocument();
  });

  it('handles zoom controls', () => {
    render(<TimelineContainer {...defaultProps} />);
    const zoomInBtn = screen.getByTitle('Zoom In');
    const zoomOutBtn = screen.getByTitle('Zoom Out');

    fireEvent.click(zoomInBtn);
    // The new logic increases by 10% or at least 1 unit. 10 * 0.1 = 1. So 10 + 1 = 11.
    expect(defaultProps.setZoomLevel).toHaveBeenCalledWith(11);

    fireEvent.click(zoomOutBtn);
    // The new logic decreases by 10% or at least 1 unit. 10 * 0.1 = 1. So 10 - 1 = 9.
    expect(defaultProps.setZoomLevel).toHaveBeenCalledWith(9);
  });

  it('handles wheel zoom', () => {
     render(<TimelineContainer {...defaultProps} />);
     const container = screen.getByText('Video Track').closest('.flex-col')?.parentElement?.querySelector('.overflow-auto');

     if (container) {
         // Zoom in (ctrl + scroll up/neg)
         fireEvent.wheel(container, { deltaY: -100, ctrlKey: true });
         expect(defaultProps.setZoomLevel).toHaveBeenCalled();
     }
  });

  it('renders ruler', () => {
    const { container } = render(<TimelineContainer {...defaultProps} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('handles drag end: normal move', () => {
    render(<TimelineContainer {...defaultProps} />);

    act(() => {
        capturedOnDragEnd({
            active: { id: 'clip-1' },
            over: { id: 'track-1' },
            delta: { x: 50, y: 0 } // +50px / 10 = +5s. New start 15.
        });
    });

    // clip-1 starts at 10. +5s = 15. Valid.
    expect(defaultProps.onMoveClip).toHaveBeenCalledWith('clip-1', 15, 'track-1');
  });

  it('handles drag end: snapping', () => {
    render(<TimelineContainer {...defaultProps} />);

    // Clip-2 starts at 30.
    // Try to move Clip-1 to 24.5. (delta +145px = +14.5s. 10+14.5 = 24.5).
    // Snap to Clip-2 start (30) - Clip-1 duration (5) = 25?
    // Or Snap to 20?
    // Let's try to snap to start (0).
    // Move Clip-1 (10) to 0.5 (delta -95px = -9.5s).

    act(() => {
        capturedOnDragEnd({
            active: { id: 'clip-1' },
            over: { id: 'track-1' },
            delta: { x: -95, y: 0 } // New start 0.5
        });
    });

    // Should snap to 0
    expect(defaultProps.onMoveClip).toHaveBeenCalledWith('clip-1', 0, 'track-1');
  });

  it('handles drag end: collision rejection/resolution', () => {
     render(<TimelineContainer {...defaultProps} />);

     // Move Clip-1 (10-15) to overlap Clip-2 (30-35).
     // Try moving to 27 (delta +170px = +17s). 27-32 overlaps 30-35.
     // Nearest valid is 25 (ends at 30).
     // Diff 27-25 = 2.
     // Tolerance = 10px / 10 = 1s. But validSlotTolerance is snapTolerance * 2 = 2s.
     // So 2 <= 2. Should work.

     act(() => {
         capturedOnDragEnd({
             active: { id: 'clip-1' },
             over: { id: 'track-1' },
             delta: { x: 170, y: 0 }
         });
     });

     // Should resolve to 25
     expect(defaultProps.onMoveClip).toHaveBeenCalledWith('clip-1', 25, 'track-1');
  });

  it('handles resize via TrackLane callback', () => {
    render(<TimelineContainer {...defaultProps} />);
    const btn = screen.getByTestId('resize-btn-clip-1');
    fireEvent.click(btn); // Calls onClipResize('clip-1', 20, 10, 5)

    // Check if it calls props
    // We mocked the logic to pass hardcoded 20, 10, 5
    // start 20 (changed from 10). moveClip should be called.
    expect(defaultProps.onMoveClip).toHaveBeenCalledWith('clip-1', 20);
    expect(defaultProps.onResizeClip).toHaveBeenCalledWith('clip-1', 10, 5);
  });

  it('calls onAddTrack when button clicked', () => {
      render(<TimelineContainer {...defaultProps} />);
      const btn = screen.getByText('+ Add Track');
      fireEvent.click(btn);
      expect(defaultProps.onAddTrack).toHaveBeenCalled();
  });

  it('opens context menu and deletes clip', () => {
      render(<TimelineContainer {...defaultProps} />);

      // Trigger context menu
      const btn = screen.getByTestId('context-btn-clip-1');
      fireEvent.click(btn); // In real app it's contextmenu event but our mock uses click

      // Check if Context Menu appears (we can look for "Delete Clip" text which is in options)
      const deleteOption = screen.getByText('Delete Clip');
      expect(deleteOption).toBeInTheDocument();

      // Click delete
      fireEvent.click(deleteOption);

      expect(defaultProps.onRemoveClip).toHaveBeenCalledWith('clip-1');
  });

  it('opens context menu and duplicates clip', () => {
      render(<TimelineContainer {...defaultProps} />);

      const btn = screen.getByTestId('context-btn-clip-1');
      fireEvent.click(btn);

      const duplicateOption = screen.getByText('Duplicate Clip');
      expect(duplicateOption).toBeInTheDocument();

      fireEvent.click(duplicateOption);

      expect(defaultProps.onDuplicateClip).toHaveBeenCalledWith('clip-1');
  });

  it('deselects clip when clicking background', () => {
      render(<TimelineContainer {...defaultProps} />);

      // Find background (scroll container)
      const canvas = document.querySelector('canvas');
      const container = canvas?.closest('.overflow-auto');

      if (container) {
          fireEvent.click(container);
          expect(defaultProps.onClipSelect).toHaveBeenCalledWith(null);
      } else {
          throw new Error('Container not found');
      }
  });

  it('deletes selected clip on Delete key', () => {
      render(<TimelineContainer {...defaultProps} selectedClipId="clip-1" />);

      fireEvent.keyDown(window, { key: 'Delete' });
      expect(defaultProps.onRemoveClip).toHaveBeenCalledWith('clip-1');
  });

  it('does not delete if editing text', () => {
      render(<TimelineContainer {...defaultProps} selectedClipId="clip-1" />);

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      fireEvent.keyDown(input, { key: 'Delete' });
      expect(defaultProps.onRemoveClip).not.toHaveBeenCalled();

      document.body.removeChild(input);
  });

  it('zooms to fit', () => {
      render(<TimelineContainer {...defaultProps} />);

      // Spy on clientWidth to ensure it returns 1000
      const spy = jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);

      // Trigger Zoom to Fit
      const btn = screen.getByTitle('Zoom to Fit');
      fireEvent.click(btn);

      // Clips end at 30+5=35.
      // Container width defaults to 1000 in component (or mocked resize observer? No, we didn't mock resize observer so it might be 0 or 1000).
      // In component: useState(1000).
      // Logic: maxTime = 35 * 1.1 = 38.5.
      // Zoom = 1000 / 38.5 = 25.97...

      expect(defaultProps.setZoomLevel).toHaveBeenCalled();
      const call = (defaultProps.setZoomLevel as jest.Mock).mock.calls[0][0];
      expect(call).toBeCloseTo(1000 / 38.5, 0);

      spy.mockRestore();
  });

  it('shows snap line during drag move', () => {
    render(<TimelineContainer {...defaultProps} />);

    // Start drag
    act(() => {
        // Need to simulate drag start logic if we were testing activeId,
        // but for onDragMove we just need to ensure active and over are present
    });

    // Move Clip-1 near 0
    act(() => {
        capturedOnDragMove({
            active: { id: 'clip-1' },
            over: { id: 'track-1' },
            delta: { x: -95, y: 0 } // Move close to 0
        });
    });

    expect(screen.getByTestId('snap-line')).toBeInTheDocument();
  });

  it('shows invalid drop feedback on collision', () => {
    render(<TimelineContainer {...defaultProps} />);

    // Start Drag
    act(() => {
        capturedOnDragStart({
            active: { id: 'clip-1' }
        });
    });

    // Move to collision spot (overlap clip-2)
    act(() => {
        capturedOnDragMove({
            active: { id: 'clip-1' },
            over: { id: 'track-1' },
            delta: { x: 170, y: 0 } // Move to 27 (overlaps 30)
        });
    });

    const overlay = screen.getByTestId('drag-overlay-preview');
    expect(overlay.className).toContain('border-red-500');
    expect(screen.getByText('🚫')).toBeInTheDocument();
  });
});
