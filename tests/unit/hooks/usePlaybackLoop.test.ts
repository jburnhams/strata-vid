import { renderHook, act } from '@testing-library/react';
import { usePlaybackLoop } from '../../../src/hooks/usePlaybackLoop';
import { useProjectStore } from '../../../src/store/useProjectStore';

// Mock requestAnimationFrame with fake timers
jest.useFakeTimers();

describe('usePlaybackLoop', () => {
  beforeEach(() => {
    // Reset store
    act(() => {
        useProjectStore.setState({
            isPlaying: false,
            currentTime: 0,
            playbackRate: 1,
            settings: { duration: 10, fps: 30, width: 1920, height: 1080 }
        });
    });

    // NOTE: We do NOT manually mock requestAnimationFrame here because Jest's fake timers
    // already handle it. Overriding it with setTimeout causes issues with cancelAnimationFrame
    // because Sinon (used by Jest) tracks timer IDs differently for timeouts vs rAF.
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear usage data, but don't restore if we didn't spy
  });

  it('should not update time when paused', () => {
    renderHook(() => usePlaybackLoop());

    act(() => {
        jest.advanceTimersByTime(100);
    });

    expect(useProjectStore.getState().currentTime).toBe(0);
  });

  it('should update time when playing', () => {
    renderHook(() => usePlaybackLoop());

    act(() => {
        useProjectStore.setState({ isPlaying: true });
    });

    // We also need to advance performance.now() if the loop relies on it.
    // Jest's fake timers usually mock Date, but performance.now might need help or is mocked.
    // Let's mock performance.now to ensure deterministic delta calculation.
    // Note: In JSDOM, performance.now() usually starts at 0.

    const initialTime = performance.now();
    // Spy on performance.now. Note: If Jest mocks it, this might layer on top.
    const perfSpy = jest.spyOn(performance, 'now');

    // Initial call
    perfSpy.mockReturnValue(initialTime);

    // Advance time
    act(() => {
        // We simulate 1 second passing
        perfSpy.mockReturnValue(initialTime + 1000);
        jest.advanceTimersByTime(1000);
    });

    expect(useProjectStore.getState().currentTime).toBeGreaterThan(0);

    perfSpy.mockRestore();
  });

  it('should stop at end of duration', () => {
      renderHook(() => usePlaybackLoop());

      act(() => {
          useProjectStore.setState({
              isPlaying: true,
              currentTime: 9.9,
              settings: { duration: 10, fps: 30, width: 1920, height: 1080 }
          });
      });

      const initialTime = performance.now();
      const perfSpy = jest.spyOn(performance, 'now');
      perfSpy.mockReturnValue(initialTime);

      act(() => {
          perfSpy.mockReturnValue(initialTime + 200); // 0.2s
          jest.advanceTimersByTime(200);
      });

      expect(useProjectStore.getState().isPlaying).toBe(false);
      expect(useProjectStore.getState().currentTime).toBe(10);

      perfSpy.mockRestore();
  });
});
