import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../../src/hooks/useKeyboardShortcuts';
import { useProjectStore } from '../../../src/store/useProjectStore';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    useProjectStore.setState({
      isPlaying: false,
      currentTime: 10,
      settings: {
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 100,
        assets: {},
        tracks: {}
      } as any, // minimal settings
      playbackRate: 1
    });
  });

  it('toggles play on Space', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });
    expect(useProjectStore.getState().isPlaying).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });
    expect(useProjectStore.getState().isPlaying).toBe(false);
  });

  it('toggles play on K', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyK' }));
    });
    expect(useProjectStore.getState().isPlaying).toBe(true);
  });

  it('rewinds 1 second on J', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ' }));
    });
    // 10 - 1 = 9
    expect(useProjectStore.getState().currentTime).toBe(9);
  });

  it('advances 1 second on L', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyL' }));
    });
    // 10 + 1 = 11
    expect(useProjectStore.getState().currentTime).toBe(11);
  });

  it('steps back 1 frame on Left Arrow', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
    });
    // 10 - 1/30 = 9.9666...
    expect(useProjectStore.getState().currentTime).toBeCloseTo(10 - 1/30, 5);
    expect(useProjectStore.getState().isPlaying).toBe(false);
  });

  it('steps forward 1 frame on Right Arrow', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    });
    // 10 + 1/30 = 10.0333...
    expect(useProjectStore.getState().currentTime).toBeCloseTo(10 + 1/30, 5);
    expect(useProjectStore.getState().isPlaying).toBe(false);
  });

  it('jumps to start on Home', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Home' }));
    });
    expect(useProjectStore.getState().currentTime).toBe(0);
  });

  it('jumps to end on End', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'End' }));
    });
    expect(useProjectStore.getState().currentTime).toBe(100);
  });

  it('ignores events in input fields', () => {
    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      // Dispatch event on input
      const event = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
      Object.defineProperty(event, 'target', { value: input, writable: false });
      input.dispatchEvent(event);
    });

    expect(useProjectStore.getState().isPlaying).toBe(false);
    document.body.removeChild(input);
  });
});
