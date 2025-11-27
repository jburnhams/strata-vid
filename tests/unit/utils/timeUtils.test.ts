
import { formatTime, formatTimeShort } from '../../../src/utils/timeUtils';

describe('timeUtils', () => {
  describe('formatTime', () => {
    it('formats seconds to MM:SS.ms', () => {
      expect(formatTime(0)).toBe('0:00.00');
      expect(formatTime(10.5)).toBe('0:10.50');
      expect(formatTime(65.123)).toBe('1:05.12');
      expect(formatTime(3600)).toBe('60:00.00');
      expect(formatTime(61)).toBe('1:01.00');
    });

    it('handles small decimals correctly', () => {
      expect(formatTime(0.05)).toBe('0:00.05');
      expect(formatTime(0.009)).toBe('0:00.00'); // floor behavior
    });
  });

  describe('formatTimeShort', () => {
    it('formats seconds to MM:SS', () => {
      expect(formatTimeShort(0)).toBe('0:00');
      expect(formatTimeShort(10.5)).toBe('0:10');
      expect(formatTimeShort(65.123)).toBe('1:05');
      expect(formatTimeShort(3600)).toBe('60:00');
      expect(formatTimeShort(61)).toBe('1:01');
    });
  });
});
