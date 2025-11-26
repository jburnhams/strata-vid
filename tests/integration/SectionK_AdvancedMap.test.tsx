
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';
import { GpxPoint, Asset, Clip, Track } from '../../src/types';
import { gpxParser, getCoordinateAtTime } from '../../src/utils/gpxParser';
import '@testing-library/jest-dom';

// Mock gpxParser for consistent test data and functionality
jest.mock('../../src/utils/gpxParser', () => ({
  gpxParser: jest.fn(),
  getCoordinateAtTime: jest.fn((points, time, syncOffset = 0) => {
    const targetTime = (time * 1000) + syncOffset;
    if (targetTime >= 2000) return { lat: 20, lon: 20, ele: 110, dist: 1573, speed: 10 }; // 10 m/s
    if (targetTime >= 1000) return { lat: 10, lon: 10, ele: 100, dist: 0, speed: 0 };
    return undefined;
  }),
}));

// Mock worker-timers to prevent errors in JSDOM
jest.mock('worker-timers', () => ({
    setInterval: (callback: () => void, interval: number) => setInterval(callback, interval),
    clearInterval: (id: any) => clearInterval(id),
}));

const mockGpxAsset: Asset = {
  id: 'gpx1',
  name: 'test.gpx',
  type: 'gpx',
  source: new File([''], 'test.gpx'),
  gpxPoints: [
    { time: 1000, lat: 10, lon: 10, ele: 100, dist: 0 },
    { time: 2000, lat: 20, lon: 20, ele: 110, dist: 1573 },
  ] as GpxPoint[],
};
(gpxParser as jest.Mock).mockResolvedValue(mockGpxAsset);

const mapClip: Clip = {
  id: 'clip1',
  assetId: 'gpx1',
  trackId: 'track1',
  type: 'map',
  name: 'Map Clip',
  start: 0,
  end: 10,
  duration: 10,
  properties: {
    trackStyle: { color: '#ff0000', weight: 3 },
  },
};
const track: Track = { id: 'track1', name: 'Track 1', clips: ['clip1'] };

const initialState = useProjectStore.getState();

describe('Section K: Advanced Map Features (Integration)', () => {

  beforeEach(() => {
    // Correctly reset the store by MERGING the initial state, not replacing
    useProjectStore.setState(initialState);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const setupTestState = () => {
    act(() => {
      // Merge state, don't replace
      useProjectStore.setState({
        assets: { gpx1: mockGpxAsset },
        tracks: { track1: track },
        clips: { clip1: mapClip },
      });
    });
  };

  test('Heatmap overlay can be enabled and renders on the map', async () => {
    const getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext');
    render(<App />);
    setupTestState();

    const clipElement = await screen.findByTestId('clip-item-clip1');
    act(() => { fireEvent.click(clipElement); });

    await screen.findByTestId('metadata-panel-clip');

    const heatmapToggle = screen.getByLabelText('Enable Heatmap');
    act(() => { fireEvent.click(heatmapToggle); });

    expect(useProjectStore.getState().clips.clip1.properties.heatmap?.enabled).toBe(true);

    await waitFor(() => {
      expect(getContextSpy).toHaveBeenCalledWith('2d');
    });
    getContextSpy.mockRestore();
  });

  test('Elevation profile can be toggled and renders', async () => {
    render(<App />);
    setupTestState();

    const clipElement = await screen.findByTestId('clip-item-clip1');
    act(() => { fireEvent.click(clipElement); });

    await screen.findByTestId('metadata-panel-clip');

    const toggleButton = await screen.findByTitle('Toggle Elevation Profile');
    act(() => { fireEvent.click(toggleButton); });

    await waitFor(() => {
        const elevationProfile = screen.getByTestId('elevation-profile');
        expect(elevationProfile).toBeInTheDocument();
        expect(elevationProfile.querySelector('svg')).toBeInTheDocument();
    });
  });

  test('Data overlay clip renders correctly and updates with time', async () => {
    render(<App />);
    setupTestState();

    const dataClip: Clip = {
      id: 'clip2', assetId: 'gpx1', trackId: 'track1', type: 'data',
      name: 'Data Overlay', start: 0, end: 5, duration: 5,
      properties: { dataOverlay: { showSpeed: true, showDistance: true, showElevation: true } }
    };

    act(() => {
        const state = useProjectStore.getState();
        useProjectStore.setState({
            clips: { ...state.clips, clip2: dataClip },
            tracks: {
                ...state.tracks,
                track1: { ...state.tracks.track1, clips: [...(state.tracks.track1?.clips || []), 'clip2'] }
            }
        });
    });

    const overlay = await screen.findByTestId('data-overlay');
    expect(overlay).toBeInTheDocument();

    expect(overlay.textContent).not.toContain('Speed');

    act(() => { useProjectStore.getState().setPlaybackTime(2); });

    await waitFor(() => {
        expect(screen.getByText(/Speed: 36.0 km\/h/)).toBeInTheDocument();
        expect(screen.getByText(/Distance: 1.57 km/)).toBeInTheDocument();
        expect(screen.getByText(/Elevation: 110.0 m/)).toBeInTheDocument();
    });
  });
});
