import { act, renderHook } from '@testing-library/react';
import { useDocumentHistory } from '../../../src/hooks/useDocumentHistory';
import { useProjectStore } from '../../../src/store/useProjectStore';
import type { Clip, Track } from '../../../src/types';

const empty = useProjectStore.getState();
const track: Track = { id: 't1', type: 'video', label: 'Track 1', isMuted: false, isLocked: false, volume: 1, clips: [] };
const clip: Clip = {
  id: 'c1', assetId: 'a1', trackId: 't1', start: 0, duration: 5, offset: 0, type: 'video',
  properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
};
const store = () => useProjectStore.getState();

describe('useDocumentHistory', () => {
  beforeEach(() => useProjectStore.setState(empty, true));

  it('names each step and undoes and redoes it', () => {
    const { result } = renderHook(() => useDocumentHistory());
    expect(result.current.canUndo).toBe(false);

    act(() => store().addTrack(track));
    act(() => store().addClip(clip));
    act(() => store().moveClip('c1', 2));
    expect(result.current.undoLabel).toBe('move clip');

    act(() => result.current.undo());
    expect(store().clips.c1.start).toBe(0);
    expect(result.current.undoLabel).toBe('add clip');
    expect(result.current.redoLabel).toBe('move clip');

    act(() => result.current.redo());
    expect(store().clips.c1.start).toBe(2);
  });

  it('makes one step of a run of changes to one property', () => {
    const { result } = renderHook(() => useDocumentHistory());
    act(() => store().addTrack(track));
    act(() => store().addClip(clip));
    act(() => {
      store().updateClipProperties('c1', { opacity: 0.8 });
      store().updateClipProperties('c1', { opacity: 0.6 });
      store().updateClipProperties('c1', { opacity: 0.4 });
    });
    expect(result.current.past).toEqual(['add track', 'add clip', 'change opacity']);

    act(() => result.current.undo());
    expect(store().clips.c1.properties.opacity).toBe(1);
  });

  it('starts again when a project is opened', () => {
    const { result } = renderHook(() => useDocumentHistory());
    act(() => store().addTrack(track));
    act(() => store().loadProject({ id: 'p2', settings: empty.settings, assets: {}, tracks: {}, clips: {}, trackOrder: [] }));
    expect(result.current.canUndo).toBe(false);
  });
});
