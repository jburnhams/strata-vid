import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransportControls } from '../../../src/components/TransportControls';
import { useProjectStore } from '../../../src/store/useProjectStore';

describe('TransportControls', () => {
  beforeEach(() => {
    // Reset store state
    useProjectStore.setState({
      currentTime: 0,
      isPlaying: false,
      playbackRate: 1,
    });
  });

  test('renders correctly', () => {
    render(<TransportControls />);
    expect(screen.getByTitle('Play (Space)')).toBeInTheDocument();
    expect(screen.getByTitle('Stop (Home)')).toBeInTheDocument();
    expect(screen.getByText('00:00.000')).toBeInTheDocument();
  });

  test('toggles play/pause state', () => {
    render(<TransportControls />);

    const playButton = screen.getByTitle('Play (Space)');

    // Initial state: Not playing
    expect(useProjectStore.getState().isPlaying).toBe(false);

    // Click Play
    fireEvent.click(playButton);
    expect(useProjectStore.getState().isPlaying).toBe(true);

    // UI should update to show Pause icon
    expect(screen.getByTitle('Pause (Space)')).toBeInTheDocument();

    // Click Pause
    const pauseButton = screen.getByTitle('Pause (Space)');
    fireEvent.click(pauseButton);
    expect(useProjectStore.getState().isPlaying).toBe(false);
  });

  test('stops playback and resets time', () => {
    useProjectStore.setState({ isPlaying: true, currentTime: 10 });

    render(<TransportControls />);

    const stopButton = screen.getByTitle('Stop (Home)');
    fireEvent.click(stopButton);

    const state = useProjectStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBe(0);
  });

  test('formats time correctly', () => {
    useProjectStore.setState({ currentTime: 65.5 }); // 1m 5.5s

    render(<TransportControls />);

    expect(screen.getByText('01:05.500')).toBeInTheDocument();
  });

  test('displays playback rate', () => {
    useProjectStore.setState({ playbackRate: 1.5 });
    render(<TransportControls />);
    expect(screen.getByText('Rate: 1.5x')).toBeInTheDocument();
  });
});
