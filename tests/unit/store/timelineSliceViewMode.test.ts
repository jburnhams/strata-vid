import { createTimelineSlice } from '../../../src/store/slices/timelineSlice';
import { TimelineSlice, StoreState } from '../../../src/store/types';
import { Track } from '../../../src/types';
import { produce } from 'immer';

// Mock set function
// Note: In real Zustand with Immer, 'set' takes a producer function.
// Here we are manually implementing a simplified version for unit testing logic.
// However, 'produce' returns a frozen object, so we can't Object.assign back to currentState if it's reused.
// We need to update the currentState variable reference.
let currentState: StoreState;

const set = jest.fn((fn) => {
  // Simulate immer produce
  currentState = produce(currentState, fn);
});
const get = jest.fn(() => currentState);

describe('timelineSlice - View Mode', () => {
  beforeEach(() => {
    // Initial state
    const initialState = {
      tracks: {},
      clips: {},
      trackOrder: [],
      markers: [],
      selectedClipId: null,
      settings: { duration: 100 } as any,
    } as StoreState;

    // Create slice actions
    // Note: This pattern is a bit hacky because we want to test the actions bound to the state
    // but the slice creator returns an object of actions that call 'set'.
    // We mix the actions into the state so we can call them like currentState.setTrackViewMode(...)
    const slice = createTimelineSlice(set, get, { type: 'zustand/immer' } as any);

    currentState = { ...initialState, ...slice };
  });

  test('setTrackViewMode updates the track view mode', () => {
    const trackId = 'track-1';
    const track: Track = {
      id: trackId,
      type: 'video',
      label: 'Video Track',
      isMuted: false,
      isLocked: false,
      volume: 1.0,
      clips: [],
      viewMode: 'frames',
    };

    currentState.addTrack(track);

    currentState.setTrackViewMode(trackId, 'waveform');
    expect(currentState.tracks[trackId].viewMode).toBe('waveform');

    currentState.setTrackViewMode(trackId, 'both');
    expect(currentState.tracks[trackId].viewMode).toBe('both');

    currentState.setTrackViewMode(trackId, 'frames');
    expect(currentState.tracks[trackId].viewMode).toBe('frames');
  });

  test('setTrackViewMode does nothing if track does not exist', () => {
    currentState.setTrackViewMode('non-existent', 'waveform');
    expect(currentState.tracks['non-existent']).toBeUndefined();
  });
});
