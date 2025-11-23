import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Playhead } from '../../../../src/components/timeline/Playhead';
import { useProjectStore } from '../../../../src/store/useProjectStore';

describe('Playhead', () => {
  beforeEach(() => {
    useProjectStore.setState({
      currentTime: 10,
      isPlaying: true,
    });
  });

  it('renders at correct position based on zoomLevel', () => {
    const { container } = render(<Playhead zoomLevel={10} />);
    const playhead = container.firstChild as HTMLElement;
    // left = 10 * 10 = 100px
    expect(playhead).toHaveStyle('left: 100px');
  });

  it('displays current time in tooltip', () => {
    render(<Playhead zoomLevel={10} />);
    expect(screen.getByText('10.00s')).toBeInTheDocument();
  });

  it('pauses playback on pointer down', () => {
      const { container } = render(<Playhead zoomLevel={10} />);
      const playhead = container.firstChild as HTMLElement;

      // Mock setPointerCapture
      playhead.setPointerCapture = jest.fn();

      fireEvent.pointerDown(playhead);

      expect(useProjectStore.getState().isPlaying).toBe(false);
  });
});
