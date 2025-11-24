import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TimelineContainer } from '../../../../src/components/timeline/TimelineContainer';
import { Track, Clip } from '../../../../src/types';

// Mock dnd-kit
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  DndContext: ({ children }: any) => <div>{children}</div>,
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
  DragOverlay: () => null,
}));

// Mock TrackLane to inspect received clips
jest.mock('../../../../src/components/timeline/TrackLane', () => ({
  TrackLane: ({ clips }: any) => (
    <div data-testid="track-lane">
      {clips.map((clip: any) => (
        <div key={clip.id} data-testid={`rendered-clip-${clip.id}`}>
            {clip.id}
        </div>
      ))}
    </div>
  ),
}));

// Mock ResizeObserver
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
global.ResizeObserver = mockResizeObserver as any;

const mockTracks: Record<string, Track> = {
  'track-1': {
    id: 'track-1',
    type: 'video',
    label: 'Video Track',
    isMuted: false,
    isLocked: false,
    clips: ['clip-visible', 'clip-hidden'],
  },
};

const mockClips: Record<string, Clip> = {
  'clip-visible': {
    id: 'clip-visible',
    assetId: 'asset-1',
    trackId: 'track-1',
    start: 0,
    duration: 10, // 0-10s -> 0-100px
    offset: 0,
    properties: {},
    type: 'video',
  } as any,
  'clip-hidden': {
    id: 'clip-hidden',
    assetId: 'asset-1',
    trackId: 'track-1',
    start: 200, // 200s -> 2000px
    duration: 10,
    offset: 0,
    properties: {},
    type: 'video',
  } as any,
};

describe('Timeline Virtualization', () => {
  const defaultProps = {
    tracks: mockTracks,
    clips: mockClips,
    assets: {},
    trackOrder: ['track-1'],
    zoomLevel: 10, // 10px per second
    setZoomLevel: jest.fn(),
    snapToGrid: true,
    allowOverlaps: false,
    setSettings: jest.fn(),
    onMoveClip: jest.fn(),
    onResizeClip: jest.fn(),
    onRemoveTrack: jest.fn(),
    onRemoveClip: jest.fn(),
    onDuplicateClip: jest.fn(),
    onSplitClip: jest.fn(),
    onRippleDeleteClip: jest.fn(),
    onAddTransition: jest.fn(),
    onAddTrack: jest.fn(),
    selectedClipId: null,
    onClipSelect: jest.fn(),
    currentTime: 0,
    isPlaying: false,
  };

  beforeAll(() => {
    // Mock Element methods
    Element.prototype.scrollTo = jest.fn();
    // Define clientWidth on HTMLElement prototype
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        value: 1000, // Default width
    });
  });

  it('only renders clips within the visible range', () => {
    render(<TimelineContainer {...defaultProps} />);

    // visible: 0-10s (0-100px).
    // container: 1000px wide (0-100s).
    // clip-visible (0-10s) should be rendered.
    // clip-hidden (200-210s) should NOT be rendered.

    expect(screen.getByTestId('rendered-clip-clip-visible')).toBeInTheDocument();

    // This assertion will FAIL before implementation
    expect(screen.queryByTestId('rendered-clip-clip-hidden')).not.toBeInTheDocument();
  });

  it('updates visible clips on scroll', () => {
    render(<TimelineContainer {...defaultProps} />);

    const scrollContainer = screen.getByText('clip-visible').closest('.overflow-auto');
    expect(scrollContainer).toBeInTheDocument();

    if (scrollContainer) {
        // Scroll to 2000px (200s)
        fireEvent.scroll(scrollContainer, { target: { scrollLeft: 2000 } });

        // Now clip-hidden should be visible
        // clip-visible should be hidden (0-10s vs 200s view)

        // We might need to wait for state update if there was one, but fireEvent is sync usually
        // However, we need to ensure the component re-renders.

        expect(screen.getByTestId('rendered-clip-clip-hidden')).toBeInTheDocument();
        expect(screen.queryByTestId('rendered-clip-clip-visible')).not.toBeInTheDocument();
    }
  });
});
