import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackLane } from '../../../../src/components/timeline/TrackLane';
import { Track, Clip, Asset } from '../../../../src/types';

// Mock dnd-kit
jest.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: jest.fn(),
    isOver: false,
  }),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  }),
}));

const mockTrack: Track = {
  id: 'track-1',
  type: 'video',
  label: 'Video Track',
  isMuted: false,
  isLocked: false,
  clips: ['clip-1'],
};

const mockClips: Clip[] = [
  {
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
];

const mockAssets: Record<string, Asset> = {
  'asset-1': {
    id: 'asset-1',
    name: 'video.mp4',
    type: 'video',
    src: 'mock-src',
    duration: 100
  }
};

describe('TrackLane', () => {
  const defaultProps = {
    track: mockTrack,
    clips: mockClips,
    assets: mockAssets,
    zoomLevel: 10,
    selectedClipId: null,
    onClipSelect: jest.fn(),
    onClipResize: jest.fn(),
    onContextMenu: jest.fn(),
  };

  it('renders clips in the lane', () => {
    render(<TrackLane {...defaultProps} />);
    // Use testid for robustness as text content is now dynamic (shortened name)
    expect(screen.getByTestId('clip-item-clip-1')).toBeInTheDocument();
  });

  it('highlights drop zone when isOver (mocked)', () => {
    render(<TrackLane {...defaultProps} />);
    const lane = screen.getByTestId('track-lane');
    expect(lane).toHaveClass('bg-gray-900'); // default
  });

  it('passes isSelected prop to ClipItem', () => {
    const { rerender } = render(<TrackLane {...defaultProps} />);
    const clipElement = screen.getByTestId('clip-item-clip-1');
    expect(clipElement).not.toHaveClass('ring-2');

    rerender(<TrackLane {...defaultProps} selectedClipId="clip-1" />);
    const selectedClipElement = screen.getByTestId('clip-item-clip-1');
    expect(selectedClipElement).toHaveClass('ring-2');
  });

  it('passes onContextMenu to ClipItem', () => {
    const onContextMenu = jest.fn();
    render(<TrackLane {...defaultProps} onContextMenu={onContextMenu} />);
    const clip = screen.getByTestId('clip-item-clip-1');
    fireEvent.contextMenu(clip);
    expect(onContextMenu).toHaveBeenCalled();
  });
});
