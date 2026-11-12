import { clipAt, placeOnTimeline, refuseOnTrack } from '../../../src/utils/timelinePlacement';
import type { Asset, Clip, Track } from '../../../src/types';

const ids = () => { let n = 0; return () => `id${++n}`; };
const track = (id: string, type: Track['type'], clips: string[] = [], over: Partial<Track> = {}): Track =>
  ({ id, type, label: id, isMuted: false, isLocked: false, volume: 1, clips, ...over });
const clip = (id: string, trackId: string, start: number, duration: number): Clip =>
  ({ id, assetId: 'x', trackId, start, duration, offset: 0, type: 'video', volume: 1, properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 } });
const asset = (type: Asset['type'], over: Partial<Asset> = {}): Asset => ({ id: `${type}-asset`, name: type, type, src: '', duration: 8, ...over });

// The edit from the visual tests: three 8 s clips end to end on Track 1.
const edit = {
  tracks: { t1: track('t1', 'video', ['c1', 'c2', 'c3']) },
  trackOrder: ['t1'],
  clips: { c1: clip('c1', 't1', 0, 8), c2: clip('c2', 't1', 8, 8), c3: clip('c3', 't1', 16, 8) },
};

describe('placeOnTimeline', () => {
  it('puts footage at the end of the video track that ends first', () => {
    const { newTrack, clip: placed } = placeOnTimeline(asset('video'), edit, ids());
    expect(newTrack).toBeUndefined();
    expect(placed).toEqual(expect.objectContaining({ trackId: 't1', start: 24, duration: 8, type: 'video' }));
  });

  it('makes Track 1 for the first clip', () => {
    const { newTrack, clip: placed } = placeOnTimeline(asset('video'), { tracks: {}, trackOrder: [], clips: {} }, ids());
    expect(newTrack).toEqual(expect.objectContaining({ type: 'video', label: 'Track 1' }));
    expect(placed).toEqual(expect.objectContaining({ trackId: newTrack!.id, start: 0 }));
  });

  it('puts sound on an audio track from the start, not after the footage', () => {
    const { newTrack, clip: placed } = placeOnTimeline(asset('audio', { duration: 20 }), edit, ids());
    expect(newTrack).toEqual(expect.objectContaining({ type: 'audio', label: 'Audio' }));
    expect(placed).toEqual(expect.objectContaining({ trackId: newTrack!.id, start: 0, duration: 20, type: 'audio' }));
  });

  it('adds more sound after the sound already there', () => {
    const state = {
      tracks: { ...edit.tracks, a1: track('a1', 'audio', ['m1']) },
      trackOrder: ['t1', 'a1'],
      clips: { ...edit.clips, m1: clip('m1', 'a1', 0, 20) },
    };
    const { newTrack, clip: placed } = placeOnTimeline(asset('audio'), state, ids());
    expect(newTrack).toBeUndefined();
    expect(placed).toEqual(expect.objectContaining({ trackId: 'a1', start: 20 }));
  });

  it('puts a route over the footage it belongs to, as an inset', () => {
    const { newTrack, clip: placed } = placeOnTimeline(asset('gpx', { duration: undefined }), edit, ids());
    expect(newTrack).toEqual(expect.objectContaining({ type: 'overlay', label: 'Route' }));
    expect(placed).toEqual(expect.objectContaining({ start: 0, duration: 24, type: 'map' }));
    expect(placed.properties.width).toBeLessThan(50);
  });

  it("runs a route for its own duration when there is no footage", () => {
    const stats = { time: { start: new Date(), end: new Date(), duration: 1_800_000 } } as Asset['stats'];
    const { clip: placed } = placeOnTimeline(asset('gpx', { duration: undefined, stats }), { tracks: {}, trackOrder: [], clips: {} }, ids());
    expect(placed).toEqual(expect.objectContaining({ start: 0, duration: 1800 }));
  });

  it('does not put a clip on a locked track', () => {
    const state = { ...edit, tracks: { t1: track('t1', 'video', ['c1', 'c2', 'c3'], { isLocked: true }) } };
    const { newTrack, clip: placed } = placeOnTimeline(asset('video'), state, ids());
    expect(newTrack).toEqual(expect.objectContaining({ type: 'video', label: 'Track 2' }));
    expect(placed.trackId).toBe(newTrack!.id);
  });
});

describe('dropping a file on a track', () => {
  it('takes sound only on audio tracks, and nothing on a locked one', () => {
    expect(refuseOnTrack(asset('audio', { name: 'bed.mp3' }), track('t1', 'video', [], { label: 'Track 1' }))).toBe('bed.mp3 is sound; put it on an audio track.');
    expect(refuseOnTrack(asset('video'), track('a', 'audio', [], { label: 'Audio' }))).toBe('Audio is for sound.');
    expect(refuseOnTrack(asset('gpx'), track('o', 'overlay'))).toBeNull();
    expect(refuseOnTrack(asset('video'), track('t1', 'video', [], { label: 'Track 1', isLocked: true }))).toBe('Track 1 is locked.');
  });

  it('makes the clip where it landed: a route as the inset, footage full frame', () => {
    const route = clipAt(asset('gpx', { duration: 0, stats: { time: { duration: 90_000 } } as Asset['stats'] }), 'o', 12, 'c9');
    expect(route).toMatchObject({ trackId: 'o', start: 12, duration: 90, type: 'map' });
    expect(route.properties).toMatchObject({ x: 58, width: 38 });
    expect(clipAt(asset('video'), 't1', 4, 'c8')).toMatchObject({ start: 4, duration: 8, type: 'video', properties: { width: 100 } });
  });
});
