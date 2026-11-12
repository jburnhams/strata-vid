import { useProjectStore } from '../../../src/store/useProjectStore';
import type { DocumentChange } from '../../../src/store/middleware/historyMiddleware';
import type { Asset, Clip, Track } from '../../../src/types';

const empty = useProjectStore.getState();
const track: Track = { id: 't1', type: 'video', label: 'Track 1', isMuted: false, isLocked: false, volume: 1, clips: [] };
const asset: Asset = { id: 'a1', name: 'run.mp4', type: 'video', src: 'blob:run', duration: 10 };
const clip: Clip = {
  id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 5, offset: 0, type: 'video',
  properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
};

describe('historyMiddleware (document recorder)', () => {
  let changes: DocumentChange[];
  let stop: () => void;

  beforeEach(() => {
    useProjectStore.setState(empty, true);
    changes = [];
    stop = useProjectStore.recordDocument((change) => changes.push(change));
  });
  afterEach(() => stop());

  it('reports a change to the document with the slices before and after', () => {
    useProjectStore.getState().addTrack(track);
    expect(changes).toHaveLength(1);
    const change = changes[0];
    expect(change.type).toBe('change');
    if (change.type !== 'change') return;
    expect(change.before.tracks).toEqual({});
    expect(change.after.tracks.t1).toBeDefined();
  });

  it('does not report playback or selection', () => {
    useProjectStore.getState().setPlaybackState({ currentTime: 3, isPlaying: true });
    useProjectStore.getState().selectClip('c1');
    expect(changes).toHaveLength(0);
  });

  it('restores a snapshot quietly, keeping the playhead and the current copy of each file', () => {
    useProjectStore.getState().addAsset(asset);
    useProjectStore.getState().addTrack(track);
    useProjectStore.getState().addClip(clip);
    const [, , added] = changes;
    if (added.type !== 'change') throw new Error('expected a change');
    useProjectStore.getState().updateAsset('a1', { thumbnail: 'data:thumb' });
    useProjectStore.getState().selectClip('c1');
    useProjectStore.getState().setPlaybackState({ currentTime: 4 });
    changes.length = 0;

    useProjectStore.restoreDocument(added.before);

    const state = useProjectStore.getState();
    expect(changes).toHaveLength(0);
    expect(state.clips.c1).toBeUndefined();
    expect(state.selectedClipId).toBeNull();
    expect(state.currentTime).toBe(4);
    expect(state.assets.a1.thumbnail).toBe('data:thumb');
  });

  it('reports opening a project as a reset, not a change', () => {
    useProjectStore.getState().loadProject({
      id: 'p2', settings: empty.settings, assets: {}, tracks: { t1: track }, clips: {}, trackOrder: ['t1'],
    });
    expect(changes).toEqual([{ type: 'reset' }]);
  });
});
