import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime } from '../time';

describe('formatRelativeTime', () => {
  let now: number;

  beforeEach(() => {
    now = 1704067200000; // 2024-01-01 00:00:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('just now', () => {
    it('should return "just now" for timestamps less than 20 seconds ago', () => {
      expect(formatRelativeTime(now - 0)).toBe('just now');
      expect(formatRelativeTime(now - 1000)).toBe('just now');
      expect(formatRelativeTime(now - 10000)).toBe('just now');
      expect(formatRelativeTime(now - 19000)).toBe('just now');
    });

    it('should return "just now" for future timestamps', () => {
      expect(formatRelativeTime(now + 1000)).toBe('just now');
      expect(formatRelativeTime(now + 10000)).toBe('just now');
    });
  });

  describe('minutes ago', () => {
    it('should return minutes for timestamps between 20 seconds and 60 minutes ago', () => {
      expect(formatRelativeTime(now - 20000)).toBe('0m ago');
      expect(formatRelativeTime(now - 60000)).toBe('1m ago');
      expect(formatRelativeTime(now - 300000)).toBe('5m ago');
      expect(formatRelativeTime(now - 3540000)).toBe('59m ago');
    });

    it('should handle single digit minutes', () => {
      expect(formatRelativeTime(now - 60000)).toBe('1m ago');
      expect(formatRelativeTime(now - 120000)).toBe('2m ago');
      expect(formatRelativeTime(now - 900000)).toBe('15m ago');
    });

    it('should handle double digit minutes', () => {
      expect(formatRelativeTime(now - 600000)).toBe('10m ago');
      expect(formatRelativeTime(now - 3000000)).toBe('50m ago');
    });
  });

  describe('hours ago', () => {
    it('should return hours for timestamps between 60 minutes and 24 hours ago', () => {
      expect(formatRelativeTime(now - 3600000)).toBe('1h ago');
      expect(formatRelativeTime(now - 7200000)).toBe('2h ago');
      expect(formatRelativeTime(now - 43200000)).toBe('12h ago');
      expect(formatRelativeTime(now - 82800000)).toBe('23h ago');
    });

    it('should handle single digit hours', () => {
      expect(formatRelativeTime(now - 3600000)).toBe('1h ago');
      expect(formatRelativeTime(now - 7200000)).toBe('2h ago');
      expect(formatRelativeTime(now - 32400000)).toBe('9h ago');
    });

    it('should handle double digit hours', () => {
      expect(formatRelativeTime(now - 36000000)).toBe('10h ago');
      expect(formatRelativeTime(now - 72000000)).toBe('20h ago');
    });
  });

  describe('yesterday', () => {
    it('should return "yesterday" for timestamps exactly 24 hours ago', () => {
      expect(formatRelativeTime(now - 86400000)).toBe('yesterday');
    });

    it('should return "yesterday" for timestamps between 24 and 48 hours ago', () => {
      expect(formatRelativeTime(now - 90000000)).toBe('yesterday');
      expect(formatRelativeTime(now - 172800000 + 1000)).toBe('yesterday');
    });
  });

  describe('days ago', () => {
    it('should return days for timestamps between 2 and 6 days ago', () => {
      expect(formatRelativeTime(now - 172800000)).toBe('2d ago');
      expect(formatRelativeTime(now - 259200000)).toBe('3d ago');
      expect(formatRelativeTime(now - 345600000)).toBe('4d ago');
      expect(formatRelativeTime(now - 432000000)).toBe('5d ago');
      expect(formatRelativeTime(now - 518400000)).toBe('6d ago');
    });

    it('should handle single digit days', () => {
      expect(formatRelativeTime(now - 172800000)).toBe('2d ago');
      expect(formatRelativeTime(now - 345600000)).toBe('4d ago');
      expect(formatRelativeTime(now - 518400000)).toBe('6d ago');
    });
  });

  describe('date format', () => {
    it('should return formatted date for timestamps more than 7 days ago', () => {
      const sevenDaysAgo = now - 604800000;
      const result = formatRelativeTime(sevenDaysAgo);

      // Should return date in format like "Dec 25" (month short, day numeric)
      expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    });

    it('should return correct date for exactly 7 days ago', () => {
      const result = formatRelativeTime(now - 604800000);
      expect(result).toBe('Dec 25');
    });

    it('should return correct date for timestamps far in the past', () => {
      const oneYearAgo = now - 31536000000;
      const result = formatRelativeTime(oneYearAgo);

      expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    });

    it('should return correct date for very old timestamps', () => {
      const tenYearsAgo = now - 315360000000;
      const result = formatRelativeTime(tenYearsAgo);

      expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    });
  });

  describe('boundary conditions', () => {
    it('should handle boundary at 20 seconds', () => {
      expect(formatRelativeTime(now - 19999)).toBe('just now');
      expect(formatRelativeTime(now - 20000)).not.toBe('just now');
    });

    it('should handle boundary at 60 minutes (1 hour)', () => {
      expect(formatRelativeTime(now - 3540000)).toBe('59m ago');
      expect(formatRelativeTime(now - 3600000)).toBe('1h ago');
    });

    it('should handle boundary at 24 hours (1 day)', () => {
      expect(formatRelativeTime(now - 86399000)).toBe('23h ago');
      expect(formatRelativeTime(now - 86400000)).toBe('yesterday');
    });

    it('should handle boundary at 48 hours (2 days)', () => {
      expect(formatRelativeTime(now - 172800000)).toBe('2d ago');
    });

    it('should handle boundary at 7 days', () => {
      expect(formatRelativeTime(now - 518400000)).toBe('6d ago');
      expect(formatRelativeTime(now - 604800000)).toBe('Dec 25');
    });
  });

  describe('edge cases', () => {
    it('should handle timestamp of 0 (epoch)', () => {
      const result = formatRelativeTime(0);
      expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    });

    it('should handle very recent timestamps', () => {
      expect(formatRelativeTime(now - 1)).toBe('just now');
      expect(formatRelativeTime(now - 100)).toBe('just now');
    });

    it('should handle timestamps at exact minute boundaries', () => {
      expect(formatRelativeTime(now - 60000)).toBe('1m ago');
      expect(formatRelativeTime(now - 120000)).toBe('2m ago');
      expect(formatRelativeTime(now - 300000)).toBe('5m ago');
    });

    it('should handle timestamps at exact hour boundaries', () => {
      expect(formatRelativeTime(now - 3600000)).toBe('1h ago');
      expect(formatRelativeTime(now - 7200000)).toBe('2h ago');
      expect(formatRelativeTime(now - 18000000)).toBe('5h ago');
    });

    it('should handle timestamps at exact day boundaries', () => {
      expect(formatRelativeTime(now - 86400000)).toBe('yesterday');
      expect(formatRelativeTime(now - 172800000)).toBe('2d ago');
      expect(formatRelativeTime(now - 259200000)).toBe('3d ago');
    });
  });

  describe('different current times', () => {
    it('should work correctly at different times of day', () => {
      // Set time to noon
      const noon = new Date('2024-01-01T12:00:00Z').getTime();
      vi.setSystemTime(noon);

      expect(formatRelativeTime(noon - 3600000)).toBe('1h ago');
      expect(formatRelativeTime(noon - 86400000)).toBe('yesterday');
    });

    it('should work correctly near midnight', () => {
      // Set time to just before midnight
      const nearMidnight = new Date('2024-01-01T23:59:59Z').getTime();
      vi.setSystemTime(nearMidnight);

      expect(formatRelativeTime(nearMidnight - 3600000)).toBe('1h ago');
      expect(formatRelativeTime(nearMidnight - 86399000)).toBe('23h ago');
    });

    it('should work correctly at midnight', () => {
      // Set time to midnight
      const midnight = new Date('2024-01-01T00:00:00Z').getTime();
      vi.setSystemTime(midnight);

      expect(formatRelativeTime(midnight - 86400000)).toBe('yesterday');
      expect(formatRelativeTime(midnight - 172800000)).toBe('2d ago');
    });
  });

  describe('date formatting details', () => {
    it('should format dates with short month names', () => {
      const testCases = [
        { timestamp: new Date('2023-01-15').getTime(), expected: 'Jan 15' },
        { timestamp: new Date('2023-02-15').getTime(), expected: 'Feb 15' },
        { timestamp: new Date('2023-03-15').getTime(), expected: 'Mar 15' },
        { timestamp: new Date('2023-04-15').getTime(), expected: 'Apr 15' },
        { timestamp: new Date('2023-05-15').getTime(), expected: 'May 15' },
        { timestamp: new Date('2023-06-15').getTime(), expected: 'Jun 15' },
        { timestamp: new Date('2023-07-15').getTime(), expected: 'Jul 15' },
        { timestamp: new Date('2023-08-15').getTime(), expected: 'Aug 15' },
        { timestamp: new Date('2023-09-15').getTime(), expected: 'Sep 15' },
        { timestamp: new Date('2023-10-15').getTime(), expected: 'Oct 15' },
        { timestamp: new Date('2023-11-15').getTime(), expected: 'Nov 15' },
        { timestamp: new Date('2023-12-15').getTime(), expected: 'Dec 15' },
      ];

      testCases.forEach(({ timestamp, expected }) => {
        vi.setSystemTime(new Date('2024-06-01').getTime());
        expect(formatRelativeTime(timestamp)).toBe(expected);
      });
    });

    it('should handle single digit days without leading zero', () => {
      const timestamp = new Date('2023-01-05').getTime();
      vi.setSystemTime(new Date('2024-06-01').getTime());

      expect(formatRelativeTime(timestamp)).toBe('Jan 5');
    });

    it('should handle double digit days', () => {
      const timestamp = new Date('2023-01-25').getTime();
      vi.setSystemTime(new Date('2024-06-01').getTime());

      expect(formatRelativeTime(timestamp)).toBe('Jan 25');
    });
  });
});
