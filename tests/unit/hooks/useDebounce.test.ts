import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../../../src/hooks/useDebounce';

describe('useDebounce', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('updates the value after the delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    rerender({ value: 'updated', delay: 500 });

    // Should not update immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('cancels the previous timeout if value changes quickly', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    rerender({ value: 'update1', delay: 500 });

    act(() => {
      jest.advanceTimersByTime(250);
    });

    rerender({ value: 'update2', delay: 500 });

    act(() => {
      jest.advanceTimersByTime(250);
    });

    // Total 500ms passed, but timer reset at 250ms, so it should still be 'initial' (or 'update1' if not cancelled, but debounce cancels)
    // Wait, if it resets, it needs another 500ms from the second update.
    // So at T=500 (250+250), it hasn't reached 500ms since 'update2'.

    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(250); // Total 500ms since 'update2'
    });

    expect(result.current).toBe('update2');
  });
});
