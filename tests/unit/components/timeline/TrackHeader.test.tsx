import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackHeader } from '../../../../src/components/timeline/TrackHeader';
import type { Track } from '../../../../src/types';

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
    const deleteBtn = screen.getByRole('button', { name: 'Delete track' });
    fireEvent.click(deleteBtn);
    expect(defaultProps.onRemove).toHaveBeenCalledWith('track-1');
  });

  it('calls onToggleMute when mute button clicked', () => {
    render(<TrackHeader {...defaultProps} />);
    const muteBtn = screen.getByRole('button', { name: 'Mute' });
    fireEvent.click(muteBtn);
    expect(defaultProps.onToggleMute).toHaveBeenCalledWith('track-1');
  });

  it('calls onToggleLock when lock button clicked', () => {
    render(<TrackHeader {...defaultProps} />);
    const lockBtn = screen.getByRole('button', { name: 'Lock' });
    fireEvent.click(lockBtn);
    expect(defaultProps.onToggleLock).toHaveBeenCalledWith('track-1');
  });

  it('calls onUpdateVolume when volume input changes', () => {
    render(<TrackHeader {...defaultProps} />);
    const volumeInput = screen.getByRole('textbox', { name: 'Track volume' });
    fireEvent.change(volumeInput, { target: { value: '50' } });
    fireEvent.blur(volumeInput);
    expect(defaultProps.onUpdateVolume).toHaveBeenCalledWith('track-1', 0.5);
  });

  it('toggles view mode and renders correct icons', () => {
      const { rerender } = render(<TrackHeader {...defaultProps} />);

      const viewModeBtn = screen.getByRole('button', { name: 'Show Video Frames Only' });
      fireEvent.click(viewModeBtn);
      expect(defaultProps.onToggleViewMode).toHaveBeenCalledWith('track-1');

      // Test other modes for coverage
      rerender(<TrackHeader {...defaultProps} track={{...mockTrack, viewMode: 'waveform'}} />);
      expect(screen.getByRole('button', { name: 'Show Waveform Only' })).toBeInTheDocument();

      rerender(<TrackHeader {...defaultProps} track={{...mockTrack, viewMode: 'both'}} />);
      expect(screen.getByRole('button', { name: 'Show Both Video and Waveform' })).toBeInTheDocument();
  });
});
