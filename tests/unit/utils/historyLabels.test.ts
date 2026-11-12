import { nameChange } from '../../../src/utils/historyLabels';
import type { DocumentSnapshot } from '../../../src/store/middleware/historyMiddleware';
import type { Clip, Track } from '../../../src/types';

const track: Track = { id: 't1', type: 'video', label: 'Track 1', isMuted: false, isLocked: false, volume: 1, clips: ['c1'] };
const clip: Clip = {
  id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 5, offset: 0, type: 'video',
  properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
};
const doc: DocumentSnapshot = {
  assets: { a1: { id: 'a1', name: 'run.mp4', type: 'video', src: 'blob:run', duration: 10 } },
  tracks: { t1: track },
  clips: { c1: clip },
  trackOrder: ['t1'],
  settings: { width: 1920, height: 1080, fps: 30, duration: 5, previewQuality: 'high', snapToGrid: true, allowOverlaps: false, simplificationTolerance: 0.0001 },
  markers: [],
};
const withClip = (change: Partial<Clip>): DocumentSnapshot => ({ ...doc, clips: { c1: { ...clip, ...change } } });

describe('nameChange', () => {
  it('names moves and trims', () => {
    expect(nameChange(doc, withClip({ start: 2 }))).toEqual({ label: 'move clip' });
    expect(nameChange(doc, withClip({ duration: 3 }))).toEqual({ label: 'trim clip' });
  });

  it('names a property and keys it, so a slider drag is one step', () => {
    const a = nameChange(doc, withClip({ properties: { ...clip.properties, opacity: 0.5 } }));
    const b = nameChange(doc, withClip({ properties: { ...clip.properties, opacity: 0.4 } }));
    expect(a?.label).toBe('change opacity');
    expect(a?.key).toBeDefined();
    expect(a?.key).toBe(b?.key);
  });

  it('names adding, splitting, duplicating and deleting clips', () => {
    const second = { ...clip, id: 'c2', start: 5 };
    expect(nameChange(doc, { ...doc, clips: { c1: clip, c2: second } })).toEqual({ label: 'duplicate clip' });
    expect(nameChange(doc, { ...doc, clips: { c1: { ...clip, duration: 2 }, c2: { ...second, start: 2, duration: 3 } } })).toEqual({ label: 'split clip' });
    expect(nameChange(doc, { ...doc, clips: {} })).toEqual({ label: 'delete clip' });
    expect(nameChange({ ...doc, clips: {} }, { ...doc, clips: { c2: { ...clip, id: 'c2', assetId: 'a9' } } })).toEqual({ label: 'add clip' });
  });

  it('names track changes', () => {
    expect(nameChange(doc, { ...doc, tracks: { t1: { ...track, isMuted: true } } })).toEqual({ label: 'mute track' });
    expect(nameChange(doc, { ...doc, tracks: {}, trackOrder: [] })).toEqual({ label: 'delete track' });
  });

  it('is not a step when only derived data changed', () => {
    expect(nameChange(doc, { ...doc, assets: { a1: { ...doc.assets.a1, thumbnail: 'data:x' } } })).toBeNull();
    expect(nameChange(doc, { ...doc, settings: { ...doc.settings, duration: 9 } })).toBeNull();
  });
});
