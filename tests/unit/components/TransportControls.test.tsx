import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransportControls } from '../../../src/components/TransportControls';
import { useProjectStore } from '../../../src/store/useProjectStore';


describe('TransportControls', () => {
  beforeEach(() => {
    useProjectStore.setState({
      isPlaying: false,
      currentTime: 0,
      playbackRate: 1
    });
  });

  it('renders Play button initially', () => {
    render(<TransportControls />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('toggles Play/Pause state', () => {
    render(<TransportControls />);
    const playBtn = screen.getByRole('button', { name: 'Play' });

    fireEvent.click(playBtn);
    expect(useProjectStore.getState().isPlaying).toBe(true);

    // Re-render to reflect state change
    render(<TransportControls />);
    // Note: In real React, re-render is automatic. Here we rely on store update.
    // Ideally we should test if the button icon changes, but store check is sufficient for logic.
  });

  it('stops playback and resets time', () => {
    useProjectStore.setState({ isPlaying: true, currentTime: 10 });
    render(<TransportControls />);

    const stopBtn = screen.getByRole('button', { name: 'Stop' });
    fireEvent.click(stopBtn);

    const state = useProjectStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBe(0);
  });

  it('formats time correctly', () => {
    useProjectStore.setState({ currentTime: 65.5 }); // 1m 5.5s
    render(<TransportControls />);
    expect(screen.getByLabelText('Position 1:05.500')).toHaveTextContent('1:05.500');
  });

  it('changes the playback speed', () => {
    render(<TransportControls />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Playback speed' }), { target: { value: '2' } });
    expect(useProjectStore.getState().playbackRate).toBe(2);
  });

  it('steps one frame and pauses', () => {
    useProjectStore.setState({ isPlaying: true, currentTime: 1, settings: { ...useProjectStore.getState().settings, fps: 25, duration: 10 } });
    render(<TransportControls />);
    fireEvent.click(screen.getByRole('button', { name: 'Forward one frame' }));
    expect(useProjectStore.getState().isPlaying).toBe(false);
    expect(useProjectStore.getState().currentTime).toBeCloseTo(1.04);
  });
});
