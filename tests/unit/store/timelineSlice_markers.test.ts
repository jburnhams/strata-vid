
import { describe, it, expect, beforeEach } from '@jest/globals';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { Marker } from '../../../src/types';

// Helper to reset store
const resetStore = () => {
  useProjectStore.setState({
    assets: {},
    tracks: {},
    clips: {},
    trackOrder: [],
    markers: [],
    currentTime: 0,
    isPlaying: false,
  });
};

describe('Store - Timeline Slice (Markers)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should add a marker', () => {
    const marker: Marker = {
      id: 'm1',
      time: 10,
      label: 'Start',
      color: '#ff0000',
    };

    useProjectStore.getState().addMarker(marker);

    const state = useProjectStore.getState();
    expect(state.markers).toHaveLength(1);
    expect(state.markers[0]).toEqual(marker);
  });

  it('should remove a marker', () => {
    const marker: Marker = { id: 'm1', time: 10, label: 'Start', color: '#ff0000' };
    useProjectStore.getState().addMarker(marker);

    useProjectStore.getState().removeMarker('m1');

    const state = useProjectStore.getState();
    expect(state.markers).toHaveLength(0);
  });

  it('should update a marker', () => {
    const marker: Marker = { id: 'm1', time: 10, label: 'Start', color: '#ff0000' };
    useProjectStore.getState().addMarker(marker);

    useProjectStore.getState().updateMarker('m1', { time: 15, label: 'Updated' });

    const state = useProjectStore.getState();
    expect(state.markers[0].time).toBe(15);
    expect(state.markers[0].label).toBe('Updated');
    expect(state.markers[0].color).toBe('#ff0000'); // Unchanged
  });
});
