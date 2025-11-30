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
  volume: 1.0,
  viewMode: 'frames'
};

describe('TrackHeader', () => {
  const defaultProps = {
    track: mockTrack,
    onRemove: jest.fn(),
    onToggleMute: jest.fn(),
    onToggleLock: jest.fn(),
    onUpdateVolume: jest.fn(),
    onToggleViewMode: jest.fn(),
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

  it('calls onUpdateVolume when volume input changes', () => {
    render(<TrackHeader {...defaultProps} />);
    const volumeInput = screen.getByTitle('Volume %');
    fireEvent.change(volumeInput, { target: { value: '50' } });
    expect(defaultProps.onUpdateVolume).toHaveBeenCalledWith('track-1', 0.5);
  });

  it('toggles view mode and renders correct icons', () => {
      const { rerender } = render(<TrackHeader {...defaultProps} />);

      const viewModeBtn = screen.getByTitle('Show Video Frames Only');
      fireEvent.click(viewModeBtn);
      expect(defaultProps.onToggleViewMode).toHaveBeenCalledWith('track-1');

      // Test other modes for coverage
      rerender(<TrackHeader {...defaultProps} track={{...mockTrack, viewMode: 'waveform'}} />);
      expect(screen.getByTitle('Show Waveform Only')).toBeInTheDocument();

      rerender(<TrackHeader {...defaultProps} track={{...mockTrack, viewMode: 'both'}} />);
      expect(screen.getByTitle('Show Both Video and Waveform')).toBeInTheDocument();
  });
});
