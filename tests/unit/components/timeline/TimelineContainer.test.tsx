import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TimelineContainer } from '../../../../src/components/timeline/TimelineContainer';
import { Track, Clip } from '../../../../src/types';

// Mock TrackLane
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
    onAddMarker: jest.fn(),
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
    expect(screen.getByTestId('resize-btn-clip-1')).toBeInTheDocument();
  });

  it('handles zoom controls', () => {
    render(<TimelineContainer {...defaultProps} />);
    const zoomInBtn = screen.getByTitle('Zoom In');
    const zoomOutBtn = screen.getByTitle('Zoom Out');

    fireEvent.click(zoomInBtn);
    expect(defaultProps.setZoomLevel).toHaveBeenCalledWith(11);

    fireEvent.click(zoomOutBtn);
    expect(defaultProps.setZoomLevel).toHaveBeenCalledWith(9);
  });

  it('handles wheel zoom', () => {
     render(<TimelineContainer {...defaultProps} />);
     const container = screen.getByText('Video Track').closest('.flex-col')?.parentElement?.querySelector('.overflow-auto');

     if (container) {
         fireEvent.wheel(container, { deltaY: -100, ctrlKey: true });
         expect(defaultProps.setZoomLevel).toHaveBeenCalled();
     }
  });

  it('renders ruler', () => {
    const { container } = render(<TimelineContainer {...defaultProps} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('toggles settings via toolbar', () => {
      render(<TimelineContainer {...defaultProps} />);
      const snapCheckbox = screen.getByLabelText('Snap');
      const overlapCheckbox = screen.getByLabelText('Overlap');

      // Starts true
      expect(snapCheckbox).toBeChecked();
      fireEvent.click(snapCheckbox);
      expect(defaultProps.setSettings).toHaveBeenCalledWith({ snapToGrid: false });

      // Starts false
      expect(overlapCheckbox).not.toBeChecked();
      fireEvent.click(overlapCheckbox);
      expect(defaultProps.setSettings).toHaveBeenCalledWith({ allowOverlaps: true });
  });

  it('handles resize via TrackLane callback', () => {
    render(<TimelineContainer {...defaultProps} />);
    const btn = screen.getByTestId('resize-btn-clip-1');
    fireEvent.click(btn);
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
      const btn = screen.getByTestId('context-btn-clip-1');
      fireEvent.click(btn);
      const deleteOption = screen.getByText('Delete Clip');
      fireEvent.click(deleteOption);
      expect(defaultProps.onRemoveClip).toHaveBeenCalledWith('clip-1');
  });

  it('renders external snap line', () => {
    render(<TimelineContainer {...defaultProps} externalSnapLine={10} />);
    // With zoomLevel 10, left should be 100px
    const line = screen.getByTestId('snap-line');
    expect(line).toBeInTheDocument();
    expect(line).toHaveStyle({ left: '100px' });
  });

  // Note: Drag interaction logic tests moved to integration level or App-level tests
  // as TimelineContainer no longer manages DndContext.
});
