import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransportControls } from '../../../src/components/TransportControls';
import { useProjectStore } from '../../../src/store/useProjectStore';

// Mock Tooltip to just render children
jest.mock('../../../src/components/Tooltip', () => ({
  Tooltip: ({ children, content }: any) => <div data-tooltip={content}>{children}</div>
}));

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
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
  });

  it('toggles Play/Pause state', () => {
    render(<TransportControls />);
    const playBtn = screen.getByLabelText('Play');

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

    const stopBtn = screen.getByLabelText('Stop');
    fireEvent.click(stopBtn);

    const state = useProjectStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBe(0);
  });

  it('formats time correctly', () => {
    useProjectStore.setState({ currentTime: 65.5 }); // 1m 5s 500ms
    render(<TransportControls />);
    expect(screen.getByText('01:05.500')).toBeInTheDocument();
  });
});
