
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TimelinePanel } from '../../../src/components/TimelinePanel';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { TimelineContainer } from '../../../src/components/timeline/TimelineContainer';

// Mock dependencies
jest.mock('../../../src/components/timeline/TimelineContainer', () => ({
  TimelineContainer: jest.fn(({ onAddTrack, onAddMarker, onMarkerClick, markers }) => (
    <div data-testid="timeline-container">
      <button data-testid="add-track-btn" onClick={onAddTrack}>Add Track</button>
      <button data-testid="add-marker-btn" onClick={onAddMarker}>Add Marker</button>
      {markers.map((m: any) => (
          <button key={m.id} data-testid={`marker-${m.id}`} onClick={() => onMarkerClick(m.id)}>
              Marker {m.label}
          </button>
      ))}
    </div>
  )),
}));

describe('TimelinePanel', () => {
  beforeEach(() => {
    useProjectStore.setState({
      tracks: {},
      clips: {},
      assets: {},
      trackOrder: [],
      markers: [],
      currentTime: 0,
      isPlaying: false,
      selectedClipId: null,
      settings: { snapToGrid: true, allowOverlaps: false },
    });
  });

  it('renders TimelineContainer', () => {
    render(<TimelinePanel />);
    expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
  });

  it('adds a track when requested by container', () => {
    render(<TimelinePanel />);
    fireEvent.click(screen.getByTestId('add-track-btn'));

    const state = useProjectStore.getState();
    expect(state.trackOrder.length).toBe(1);

    const trackId = state.trackOrder[0];
    expect(state.tracks[trackId].label).toBe('Track 1');
  });

  it('adds a marker when requested by container', () => {
    useProjectStore.setState({ currentTime: 10 });
    render(<TimelinePanel />);

    fireEvent.click(screen.getByTestId('add-marker-btn'));

    const state = useProjectStore.getState();
    expect(state.markers.length).toBe(1);
    expect(state.markers[0].time).toBe(10);
  });

  it('seeks when a marker is clicked', () => {
      const marker = { id: 'm1', time: 50, label: 'Test', color: 'red' };
      useProjectStore.setState({ markers: [marker] });

      render(<TimelinePanel />);
      fireEvent.click(screen.getByTestId('marker-m1'));

      const state = useProjectStore.getState();
      expect(state.currentTime).toBe(50);
  });

  it('passes settings to TimelineContainer', () => {
      useProjectStore.setState({ settings: { snapToGrid: false, allowOverlaps: true } });
      render(<TimelinePanel />);
  });
});
