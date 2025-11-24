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

  it('updates current time on drag', () => {
    render(<Playhead zoomLevel={10} />);
    const playhead = screen.getByTestId('playhead');

    // Mock parent for offset calculation
    // We define offsetParent on the element itself because in JSDOM it might be null or hard to control
    Object.defineProperty(playhead, 'offsetParent', {
      configurable: true,
      get: () => ({
        getBoundingClientRect: () => ({ left: 100, top: 0, width: 1000, height: 100 })
      })
    });

    // Mock setPointerCapture and releasePointerCapture
    playhead.setPointerCapture = jest.fn();
    playhead.releasePointerCapture = jest.fn();

    // Mouse Down
    // Simulate clicking at the current position (10s * 10px/s = 100px relative).
    // Parent left is 100. So clientX = 200.
    fireEvent.pointerDown(playhead, { clientX: 200, pointerId: 1 });
    expect(useProjectStore.getState().isPlaying).toBe(false);

    // Mouse Move (drag to 20s)
    // 20s * 10px/s = 200px relative.
    // clientX = 100 (parent left) + 200 = 300.
    // Note: fireEvent.pointerMove sometimes has issues with clientX in JSDOM/TestingLibrary, so we construct event manually
    const moveEvent = new MouseEvent('pointermove', { bubbles: true, clientX: 300 });
    Object.defineProperty(moveEvent, 'pointerId', { value: 1 });
    fireEvent(playhead, moveEvent);

    expect(useProjectStore.getState().currentTime).toBe(20);

    // Test Clamping (drag left of parent)
    // clientX = 50 (parent left is 100) -> -50 relative
    const moveEvent2 = new MouseEvent('pointermove', { bubbles: true, clientX: 50 });
    Object.defineProperty(moveEvent2, 'pointerId', { value: 1 });
    fireEvent(playhead, moveEvent2);

    expect(useProjectStore.getState().currentTime).toBe(0);

    // Mouse Up
    fireEvent.pointerUp(playhead, { pointerId: 1 });
  });
});
