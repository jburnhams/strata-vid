import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackHeader } from '../../../../src/components/timeline/TrackHeader';
import type { Track } from '../../../../src/types';

const mockTrack: Track = {
  id: 'track-1',
  type: 'video',
  label: 'Footage',
  isMuted: false,
  isLocked: false,
  clips: [],
  volume: 1.0,
  viewMode: 'frames'
};

describe('TrackHeader', () => {
  const props = () => ({
    track: mockTrack,
    onRemove: jest.fn(),
    onToggleMute: jest.fn(),
    onToggleLock: jest.fn(),
    onUpdateVolume: jest.fn(),
    onSetViewMode: jest.fn(),
  });

  it('names mute and lock for the track and shows their state', () => {
    const p = props();
    render(<TrackHeader {...p} track={{ ...mockTrack, isMuted: true }} />);
    expect(screen.getByRole('button', { name: 'Mute Footage' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Lock Footage' }));
    expect(p.onToggleLock).toHaveBeenCalledWith('track-1');
  });

  it('keeps volume, what clips show and delete in the track settings', async () => {
    const p = props();
    render(<TrackHeader {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Footage settings' }));
    const dialog = await screen.findByRole('dialog', { name: 'Footage settings' });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Waveform' }));
    expect(p.onSetViewMode).toHaveBeenCalledWith('track-1', 'waveform');

    const volume = screen.getByRole('textbox', { name: 'Track volume' });
    fireEvent.change(volume, { target: { value: '150' } });
    fireEvent.blur(volume);
    expect(p.onUpdateVolume).toHaveBeenCalledWith('track-1', 1.5);

    fireEvent.click(screen.getByRole('button', { name: 'Delete track' }));
    expect(p.onRemove).toHaveBeenCalledWith('track-1');
  });

  it('offers no view choice on an audio track', async () => {
    render(<TrackHeader {...props()} track={{ ...mockTrack, type: 'audio' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Footage settings' }));
    await screen.findByRole('dialog', { name: 'Footage settings' });
    expect(screen.queryByRole('radiogroup', { name: 'Clips show' })).not.toBeInTheDocument();
  });
});
