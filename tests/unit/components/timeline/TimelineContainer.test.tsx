import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelineContainer } from '../../../../src/components/timeline/TimelineContainer';
import { Track, Clip } from '../../../../src/types';

// Mock dnd-kit
jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

const mockTracks: Record<string, Track> = {
  'track-1': {
    id: 'track-1',
    type: 'video',
    label: 'Video Track',
    isMuted: false,
    isLocked: false,
    clips: ['clip-1'],
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
    properties: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
    },
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
    selectedClipId: null,
    onClipSelect: jest.fn(),
  };

  it('renders tracks and clips', () => {
    render(<TimelineContainer {...defaultProps} />);
    expect(screen.getByText('Video Track')).toBeInTheDocument();
    expect(screen.getByText('clip-1')).toBeInTheDocument();
  });

  it('handles zoom controls', () => {
    render(<TimelineContainer {...defaultProps} />);
    const zoomInBtn = screen.getByText('+');
    const zoomOutBtn = screen.getByText('-');

    fireEvent.click(zoomInBtn);
    expect(defaultProps.setZoomLevel).toHaveBeenCalledWith(11); // min(500, 10+1)

    fireEvent.click(zoomOutBtn);
    expect(defaultProps.setZoomLevel).toHaveBeenCalledWith(9); // max(1, 10-1)
  });

  it('renders ruler', () => {
    // Ruler is canvas, hard to test content, but we check it renders
    const { container } = render(<TimelineContainer {...defaultProps} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
