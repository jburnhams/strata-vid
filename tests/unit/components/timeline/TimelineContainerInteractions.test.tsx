import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineContainer } from '../../../../src/components/timeline/TimelineContainer';
import type { Track, Clip } from '../../../../src/types';

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

// Mock TrackLane
jest.mock('../../../../src/components/timeline/TrackLane', () => ({
  TrackLane: ({ clipMenu, clips }: any) => (
    <div data-testid="track-lane">
      {clips.map((clip: any) => (
        <div key={clip.id} data-testid={`clip-${clip.id}`}>
          {clip.id}
          {clipMenu(clip.id).filter((e: any) => e !== 'separator').map((c: any) => (
            <button key={c.id} data-testid={`menu-option-${c.label}`} disabled={!!c.disabled} title={typeof c.disabled === 'string' ? c.disabled : undefined} onClick={c.run}>
              {c.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  ),
}));

// Mock ZoomControls
jest.mock('../../../../src/components/timeline/ZoomControls', () => ({
  ZoomControls: ({ onZoomToFit }: any) => (
    <button data-testid="zoom-to-fit" onClick={onZoomToFit}>Zoom Fit</button>
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
    clips: ['clip-1', 'clip-2'],
  },
};

const mockClips: Record<string, Clip> = {
  'clip-1': {
    id: 'clip-1',
    assetId: 'asset-1',
    trackId: 'track-1',
    start: 0,
    duration: 10,
    offset: 0,
    properties: {},
    type: 'video',
  } as any,
  'clip-2': {
    id: 'clip-2',
    assetId: 'asset-1',
    trackId: 'track-1',
    start: 20,
    duration: 10,
    offset: 0,
    properties: {},
    type: 'video',
  } as any,
};

describe('TimelineContainer Interactions', () => {
  const defaultProps = {
    tracks: mockTracks,
    clips: mockClips,
    assets: {},
    trackOrder: ['track-1'],
    zoomLevel: 10,
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
    onToggleTrackMute: jest.fn(),
    onToggleTrackLock: jest.fn(),
    onAddMarker: jest.fn(),
    selectedClipId: null,
    onClipSelect: jest.fn(),
    currentTime: 0,
    isPlaying: false,
  };

  beforeAll(() => {
    Element.prototype.scrollTo = jest.fn();
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        value: 1000,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles zoom via Ctrl+Wheel', () => {
    render(<TimelineContainer {...defaultProps} />);
    const container = screen.getByTestId('clip-clip-1').closest('.overflow-auto');

    // Zoom In
    fireEvent.wheel(container!, { ctrlKey: true, deltaY: -100 });
    expect(defaultProps.setZoomLevel).toHaveBeenCalledWith(expect.any(Number));

    // Zoom Out
    fireEvent.wheel(container!, { ctrlKey: true, deltaY: 100 });
    expect(defaultProps.setZoomLevel).toHaveBeenCalledTimes(2);
  });

  it('handles Zoom to Fit', () => {
    render(<TimelineContainer {...defaultProps} />);
    fireEvent.click(screen.getByTestId('zoom-to-fit'));
    // Should calculate zoom based on max time (30s) + buffer
    expect(defaultProps.setZoomLevel).toHaveBeenCalled();
  });

  it('opens context menu and handles actions', () => {
    render(<TimelineContainer {...defaultProps} currentTime={5} />); // Playhead at 5s (inside clip-1)

    // Split clip, from clip-1's menu
    const splitBtn = screen.getAllByTestId('menu-option-Split clip')[0];
    expect(splitBtn).not.toBeDisabled();
    fireEvent.click(splitBtn);
    expect(defaultProps.onSplitClip).toHaveBeenCalledWith('clip-1', 5);
  });

  it('disables Split Clip when playhead is outside', () => {
    render(<TimelineContainer {...defaultProps} currentTime={15} />); // Playhead at 15s (between clips)

    const splitBtn = screen.getAllByTestId('menu-option-Split clip')[0];
    expect(splitBtn).toBeDisabled();
    expect(splitBtn).toHaveAttribute('title', 'Move the playhead inside the clip');
  });

  it('handles Delete key for selected clip', () => {
    render(<TimelineContainer {...defaultProps} selectedClipId="clip-1" />);

    fireEvent.keyDown(window, { key: 'Delete' });
    expect(defaultProps.onRemoveClip).toHaveBeenCalledWith('clip-1');
  });

  it('ignores Delete key when input is focused', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <TimelineContainer {...defaultProps} selectedClipId="clip-1" />
        <input data-testid="test-input" />
      </div>
    );

    const input = screen.getByTestId('test-input');
    await user.click(input);
    await user.keyboard('{Delete}');
    expect(defaultProps.onRemoveClip).not.toHaveBeenCalled();
  });

  it('handles toolbar interactions', () => {
    render(<TimelineContainer {...defaultProps} />);

    // Add Marker
    fireEvent.click(screen.getByRole('button', { name: 'Add marker' }));
    expect(defaultProps.onAddMarker).toHaveBeenCalled();

    // Add Track
    fireEvent.click(screen.getByText('+ Add Track'));
    expect(defaultProps.onAddTrack).toHaveBeenCalled();

    // Snap Checkbox
    fireEvent.click(screen.getByRole('button', { name: 'Snap' }));
    expect(defaultProps.setSettings).toHaveBeenCalledWith({ snapToGrid: false }); // defaulted to true

    // Overlap Checkbox
    fireEvent.click(screen.getByRole('button', { name: 'Allow overlaps' }));
    expect(defaultProps.setSettings).toHaveBeenCalledWith({ allowOverlaps: true }); // defaulted to false
  });

  it('handles auto-scroll during playback', () => {
      // Mock scrollTo
      const scrollToMock = jest.fn();
      Element.prototype.scrollTo = scrollToMock;

      // Render with playback playing
      const { rerender } = render(<TimelineContainer {...defaultProps} isPlaying={true} currentTime={90} />);

      // Advance time to 95s -> 950px.
      rerender(<TimelineContainer {...defaultProps} isPlaying={true} currentTime={95} />);

      expect(scrollToMock).toHaveBeenCalled();
  });
});
