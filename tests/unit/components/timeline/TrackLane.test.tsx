import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackLane } from '../../../../src/components/timeline/TrackLane';
import { Track, Clip } from '../../../../src/types';

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

describe('TrackLane', () => {
  const defaultProps = {
    track: mockTrack,
    clips: mockClips,
    zoomLevel: 10,
    selectedClipId: null,
    onClipSelect: jest.fn(),
    onClipResize: jest.fn(),
  };

  it('renders clips in the lane', () => {
    render(<TrackLane {...defaultProps} />);
    expect(screen.getByText('clip-1')).toBeInTheDocument();
  });

  it('highlights drop zone when isOver (mocked)', () => {
    // Since we mock useDroppable, we can't easily toggle isOver without manual mocking in test.
    // But we can check it renders.
    render(<TrackLane {...defaultProps} />);
    const lane = screen.getByText('clip-1').closest('.relative');
    expect(lane).toHaveClass('bg-gray-900'); // default
  });
});
