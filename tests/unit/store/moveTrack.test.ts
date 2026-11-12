import { useProjectStore } from '../../../src/store/useProjectStore';
import type { Track } from '../../../src/types';

const empty = useProjectStore.getState();
const track = (id: string): Track => ({ id, type: 'video', label: id, isMuted: false, isLocked: false, volume: 1, clips: [] });

describe('moveTrack', () => {
  beforeEach(() => {
    useProjectStore.setState({ ...empty, tracks: { a: track('a'), b: track('b'), c: track('c') }, trackOrder: ['a', 'b', 'c'] }, true);
  });

  it('moves a track up and down the list', () => {
    useProjectStore.getState().moveTrack('c', -1);
    expect(useProjectStore.getState().trackOrder).toEqual(['a', 'c', 'b']);
    useProjectStore.getState().moveTrack('a', 1);
    expect(useProjectStore.getState().trackOrder).toEqual(['c', 'a', 'b']);
  });

  it('does nothing past either end', () => {
    useProjectStore.getState().moveTrack('a', -1);
    useProjectStore.getState().moveTrack('c', 1);
    expect(useProjectStore.getState().trackOrder).toEqual(['a', 'b', 'c']);
  });
});
