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
            settings: { duration: 10, fps: 30, width: 1920, height: 1080 },
            addToast: jest.fn(), // Mock addToast
        });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
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

    const initialTime = performance.now();
    const perfSpy = jest.spyOn(performance, 'now');

    perfSpy.mockReturnValue(initialTime);

    // Advance time
    act(() => {
        perfSpy.mockReturnValue(initialTime + 1000);
        jest.advanceTimersByTime(1000);
    });

    expect(useProjectStore.getState().currentTime).toBeGreaterThan(0);

    perfSpy.mockRestore();
  });

  it('should respect playbackRate', () => {
    renderHook(() => usePlaybackLoop());

    act(() => {
        useProjectStore.setState({ isPlaying: true, playbackRate: 2 });
    });

    const initialTime = performance.now();
    const perfSpy = jest.spyOn(performance, 'now');
    perfSpy.mockReturnValue(initialTime);

    // Advance 1 second real time
    act(() => {
        perfSpy.mockReturnValue(initialTime + 1000);
        jest.advanceTimersByTime(1000);
    });

    expect(useProjectStore.getState().currentTime).toBeCloseTo(2, 0.1);

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

  it('should trigger performance warning on lag', () => {
    const addToastMock = jest.fn();
    act(() => {
        useProjectStore.setState({
            isPlaying: true,
            addToast: addToastMock
        });
    });

    renderHook(() => usePlaybackLoop());

    const initialTime = performance.now();
    const perfSpy = jest.spyOn(performance, 'now');
    perfSpy.mockReturnValue(initialTime);

    let currentTime = initialTime;

    // Simulate 65 laggy frames
    act(() => {
        for (let i = 0; i < 65; i++) {
             // Advance 100ms per frame (lag)
             currentTime += 100;
             perfSpy.mockReturnValue(currentTime);

             // Only advance timer enough to trigger one rAF (approx 16ms)
             // This ensures we don't trigger multiple rAF calls with the same "laggy" timestamp
             // resulting in delta=0 which would reset the counter.
             jest.advanceTimersByTime(20);
        }
    });

    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining('Low performance'), 'warning');

    perfSpy.mockRestore();
  });
});
