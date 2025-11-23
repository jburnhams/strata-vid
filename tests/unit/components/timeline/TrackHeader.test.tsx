import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackHeader } from '../../../../src/components/timeline/TrackHeader';
import { Track } from '../../../../src/types';

const mockTrack: Track = {
  id: 'track-1',
  type: 'video',
  label: 'Video Track',
  isMuted: false,
  isLocked: false,
  clips: [],
};

describe('TrackHeader', () => {
  const defaultProps = {
    track: mockTrack,
    onRemove: jest.fn(),
    onToggleMute: jest.fn(),
    onToggleLock: jest.fn(),
  };

  it('renders track label', () => {
    render(<TrackHeader {...defaultProps} />);
    expect(screen.getByText('Video Track')).toBeInTheDocument();
  });

  it('calls onRemove when delete button clicked', () => {
    render(<TrackHeader {...defaultProps} />);
    const deleteBtn = screen.getByTitle('Delete Track');
    fireEvent.click(deleteBtn);
    expect(defaultProps.onRemove).toHaveBeenCalledWith('track-1');
  });

  it('calls onToggleMute when mute button clicked', () => {
    render(<TrackHeader {...defaultProps} />);
    const muteBtn = screen.getByTitle('Mute');
    fireEvent.click(muteBtn);
    expect(defaultProps.onToggleMute).toHaveBeenCalledWith('track-1');
  });

  it('calls onToggleLock when lock button clicked', () => {
    render(<TrackHeader {...defaultProps} />);
    const lockBtn = screen.getByTitle('Lock');
    fireEvent.click(lockBtn);
    expect(defaultProps.onToggleLock).toHaveBeenCalledWith('track-1');
  });
});
