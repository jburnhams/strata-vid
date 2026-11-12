import { footageOf, footageRateAt, routeSeconds, timeAtRouteSeconds } from '../../../src/utils/routeClock';
import type { Clip, Track } from '../../../src/types';

const clip = (id: string, over: Partial<Clip>): Clip => ({
  id, assetId: id, trackId: 't1', start: 0, duration: 10, offset: 0, type: 'video',
  properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }, ...over,
});

// Footage: 0–10 s at 1×, 10–15 s at 2× (ten seconds of the run in five), then nothing.
const footage = [clip('a', { start: 0, duration: 10 }), clip('b', { start: 10, duration: 5, playbackRate: 2 })];
const route = clip('r', { type: 'map', start: 0, duration: 20 });

describe('the route clock', () => {
  it('runs at the speed of the footage under it, and at real speed where there is none', () => {
    expect(routeSeconds(route, 5, footage)).toBe(5);
    expect(routeSeconds(route, 12, footage)).toBe(14);
    expect(routeSeconds(route, 15, footage)).toBe(20);
    expect(routeSeconds(route, 17, footage)).toBe(22);
  });

  it('starts a trimmed or split route clip where its trim says', () => {
    const second = clip('r2', { type: 'map', start: 10, duration: 10, offset: 10 });
    expect(routeSeconds(second, 10, footage)).toBe(10);
    expect(routeSeconds(second, 15, footage)).toBe(20);
  });

  it('turns route seconds back into the timeline time, for seeking from the profile', () => {
    for (const t of [3, 10, 12.5, 15, 18]) {
      expect(timeAtRouteSeconds(route, routeSeconds(route, t, footage), footage)).toBeCloseTo(t);
    }
  });

  it('takes the speed of the clip drawn on top', () => {
    const over = [...footage, clip('c', { start: 0, duration: 4, playbackRate: 4 })];
    expect(footageRateAt(over, 2)).toBe(4);
    expect(footageRateAt(over, 6)).toBe(1);
  });

  it('lists only video clips, in track order', () => {
    const tracks: Record<string, Track> = {
      t1: { id: 't1', type: 'video', label: '', isMuted: false, isLocked: false, volume: 1, clips: ['a'] },
      t2: { id: 't2', type: 'overlay', label: '', isMuted: false, isLocked: false, volume: 1, clips: ['r'] },
    };
    expect(footageOf(['t1', 't2'], tracks, { a: footage[0], r: route }).map((c) => c.id)).toEqual(['a']);
  });
});
