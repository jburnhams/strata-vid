import { describe, it, expect } from '@jest/globals';
import { checkCollision, getSnapPoints, findNearestSnapPoint, findNearestValidTime } from '../../../src/utils/timelineUtils';
import { Clip } from '../../../src/types';

const createMockClip = (id: string, start: number, duration: number, trackId: string = 'track-1'): Clip => ({
  id,
  assetId: 'asset-1',
  trackId,
  start,
  duration,
  offset: 0,
  type: 'video',
  properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
});

describe('timelineUtils', () => {
  describe('checkCollision', () => {
    const clips = [
      createMockClip('c1', 10, 10), // 10-20
      createMockClip('c2', 30, 10), // 30-40
    ];

    it('should detect overlap with existing clip', () => {
      // Overlap with c1 (10-20)
      expect(checkCollision(5, 10, clips)).toBe(true); // 5-15
      expect(checkCollision(15, 10, clips)).toBe(true); // 15-25
      expect(checkCollision(12, 2, clips)).toBe(true); // 12-14 (inside)
    });

    it('should return false for non-overlapping positions', () => {
      expect(checkCollision(0, 10, clips)).toBe(false); // 0-10 (touches start)
      expect(checkCollision(20, 10, clips)).toBe(false); // 20-30 (touches end)
      expect(checkCollision(40, 10, clips)).toBe(false); // 40-50
    });

    it('should ignore self', () => {
      const clipsWithSelf = [...clips, createMockClip('c3', 5, 10)]; // 5-15
      expect(checkCollision(6, 10, clipsWithSelf, 'c3')).toBe(true); // Collides with c1
      // If we move c3 to 0-10, it shouldn't collide with c1 (10-20)
      expect(checkCollision(0, 10, clipsWithSelf, 'c3')).toBe(false);
    });
  });

  describe('getSnapPoints', () => {
    it('should return start, clip edges, and playhead', () => {
      const clips: Record<string, Clip> = {
        c1: createMockClip('c1', 10, 5),
        c2: createMockClip('c2', 20, 5),
      };
      const points = getSnapPoints(clips, 5); // Playhead at 5
      expect(points).toEqual([0, 5, 10, 15, 20, 25]);
    });
  });

  describe('findNearestSnapPoint', () => {
    const points = [0, 10, 20];

    it('should find nearest point within tolerance', () => {
      expect(findNearestSnapPoint(10.5, points, 1)).toBe(10);
      expect(findNearestSnapPoint(9.5, points, 1)).toBe(10);
      expect(findNearestSnapPoint(1.5, points, 2)).toBe(0);
    });

    it('should return null if no point within tolerance', () => {
      expect(findNearestSnapPoint(15, points, 1)).toBeNull();
    });
  });

  describe('findNearestValidTime', () => {
    const clips = [
      createMockClip('c1', 10, 10), // 10-20
    ];

    it('should return current position if valid', () => {
        // 30-40 is valid
        expect(findNearestValidTime(30, 10, clips, 1)).toBe(30);
    });

    it('should find nearest valid slot (snap to end)', () => {
      // Try 20.5 (collides/overlaps slightly or just gap), well 20 is valid end of c1
      // 10-20. Try placing at 19 (overlap). 20 is valid.
      // Tolerance 2.
      expect(findNearestValidTime(19, 10, clips, 2)).toBe(20);
    });

    it('should find nearest valid slot (snap to start)', () => {
      // c1 starts at 10.
      // Try placing a 5s clip at 6 (ends at 11, overlaps).
      // Valid spot is 10-5 = 5. (ends at 10).
      expect(findNearestValidTime(6, 5, clips, 2)).toBe(5);
    });

    it('should reject if nearest valid is too far', () => {
      // Try placing at 15 (middle of 10-20). Nearest valid is 20 or 5. (diff 5).
      // Tolerance 1.
      expect(findNearestValidTime(15, 5, clips, 1)).toBeNull();
    });

    it('should handle complex multiple clips', () => {
        // 0-10 (c1), 20-30 (c2). Gap 10-20.
        const complexClips = [
            createMockClip('c1', 0, 10),
            createMockClip('c2', 20, 10)
        ];

        // Try placing 8s clip at 11 (11-19). Valid.
        expect(findNearestValidTime(11, 8, complexClips, 1)).toBe(11);

        // Try placing 12s clip at 9 (9-21). Overlaps both.
        // Nearest valid?
        // 0-10 occupied. 20-30 occupied.
        // Candidates:
        // c1.end = 10. (10+12=22 collision with c2). Invalid.
        // c2.start - 12 = 8. (8+12=20, overlaps c1 at 8-10). Invalid.
        // c2.end = 30. (30+12=42). Valid. Diff = 30-9=21. Too far.
        // 0. (0+12=12 collision).

        // Should return null.
        expect(findNearestValidTime(9, 12, complexClips, 5)).toBeNull();
    });
  });
});
