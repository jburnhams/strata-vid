import { interpolateValue } from '../../../src/utils/animationUtils';
import { Keyframe } from '../../../src/types';

describe('interpolateValue', () => {
  const keyframes: Keyframe[] = [
    { id: '1', time: 0, value: 0, easing: 'linear' },
    { id: '2', time: 10, value: 100, easing: 'linear' },
    { id: '3', time: 20, value: 50, easing: 'linear' },
  ];

  it('returns default value if no keyframes', () => {
    expect(interpolateValue(undefined, 5, 10)).toBe(10);
    expect(interpolateValue([], 5, 10)).toBe(10);
  });

  it('returns first keyframe value if time is before start', () => {
    expect(interpolateValue(keyframes, -1, 10)).toBe(0);
  });

  it('returns last keyframe value if time is after end', () => {
    expect(interpolateValue(keyframes, 25, 10)).toBe(50);
  });

  it('interpolates linearly between keyframes', () => {
    expect(interpolateValue(keyframes, 5, 10)).toBe(50);
    expect(interpolateValue(keyframes, 15, 10)).toBe(75);
  });

  it('handles ease-in', () => {
    const kf: Keyframe[] = [
      { id: '1', time: 0, value: 0, easing: 'ease-in' },
      { id: '2', time: 10, value: 100, easing: 'linear' },
    ];
    // At 50% time, ease-in should be less than 50% value (t*t = 0.25)
    expect(interpolateValue(kf, 5, 0)).toBe(25);
  });

  it('handles ease-out', () => {
    const kf: Keyframe[] = [
      { id: '1', time: 0, value: 0, easing: 'ease-out' },
      { id: '2', time: 10, value: 100, easing: 'linear' },
    ];
    // At 50% time, ease-out should be more than 50% value (t*(2-t) = 0.5 * 1.5 = 0.75)
    expect(interpolateValue(kf, 5, 0)).toBe(75);
  });

  it('handles ease-in-out', () => {
    const kf: Keyframe[] = [
      { id: '1', time: 0, value: 0, easing: 'ease-in-out' },
      { id: '2', time: 10, value: 100, easing: 'linear' },
    ];
    // At 25% time (progress=0.25), should be ease-in half (2*t*t = 2*0.25*0.25 = 0.125)
    expect(interpolateValue(kf, 2.5, 0)).toBe(12.5);
    // At 50% time (progress=0.5), should be exactly halfway
    expect(interpolateValue(kf, 5, 0)).toBe(50);
    // At 75% time (progress=0.75), should be ease-out half
    // -1 + (4 - 2*t)*t = -1 + (4 - 1.5)*0.75 = -1 + 2.5 * 0.75 = -1 + 1.875 = 0.875
    expect(interpolateValue(kf, 7.5, 0)).toBe(87.5);
  });

  it('handles zero duration between keyframes', () => {
    const kf: Keyframe[] = [
        { id: '1', time: 0, value: 0, easing: 'linear' },
        { id: '2', time: 0, value: 100, easing: 'linear' },
    ];
    // Should probably return the second value
    // Since our loop condition is currentTime < k2.time, if times are equal, loop condition fails.
    // Wait, if currentTime is exactly 0?
    // In our implementation:
    // currentTime = 0.
    // k1.time = 0, k2.time = 0.
    // if (currentTime >= k1.time && currentTime < k2.time) -> 0 >= 0 && 0 < 0 -> False.
    // Loop finishes.
    // Returns defaultValue? No.
    // Let's see the logic again.
    // 2. After last keyframe
    // if (currentTime >= keyframes[last].time) -> 0 >= 0 -> Returns last value.
    expect(interpolateValue(kf, 0, 10)).toBe(100);
  });
});
