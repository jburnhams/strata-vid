import React from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';
import { Asset, Clip, GpxPoint } from '../../src/types';

// Define mock data directly in the test file
const mockGpxPoints: GpxPoint[] = [
  { time: 1000, lat: 0, lon: 0, ele: 10, dist: 0, speed: 5 },
  { time: 2000, lat: 0, lon: 0, ele: 12, dist: 5, speed: 6 },
  { time: 3000, lat: 0, lon: 0, ele: 15, dist: 11, speed: 7 },
];

const mockGpxAsset: Asset = {
  id: 'gpx1',
  name: 'test.gpx',
  type: 'gpx',
  src: 'blob:gpx',
  gpxPoints: mockGpxPoints,
};

const mockDataClip: Clip = {
  id: 'clip1',
  assetId: 'gpx1',
  trackId: 'track1',
  start: 0,
  duration: 10,
  offset: 0,
  type: 'data',
  properties: {
    x: 10, y: 10, width: 30, height: 20, rotation: 0, opacity: 1, zIndex: 1,
    dataOverlay: {
      showSpeed: true,
      showDistance: true,
      showElevation: true,
      speedUnit: 'kmh',
      distanceUnit: 'km',
      elevationUnit: 'm',
    },
  },
  textStyle: {
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    textAlign: 'left',
  },
};

describe('Data Overlay Integration', () => {
  beforeEach(() => {
    // Reset Zustand store before each test
    const initialState = useProjectStore.getState();
    useProjectStore.setState({
      ...initialState,
      assets: { [mockGpxAsset.id]: mockGpxAsset },
      tracks: { 'track1': { id: 'track1', type: 'overlay', label: 'Overlay', isMuted: false, isLocked: false, clips: ['clip1'] } },
      clips: { [mockDataClip.id]: mockDataClip },
      selectedClipId: mockDataClip.id,
      trackOrder: ['track1'],
    }, true);
  });

  it('renders data overlay with initial properties and updates on change', async () => {
    render(<App />);

    // Wait for the overlay to appear
    const overlay = await screen.findByTestId('data-overlay');
    expect(overlay).toBeInTheDocument();
    expect(within(overlay).getByText(/Speed/)).toBeInTheDocument();

    // Simulate user changing speed unit in MetadataPanel
    const speedUnitSelector = screen.getByLabelText('Speed Unit');
    await act(async () => {
        fireEvent.change(speedUnitSelector, { target: { value: 'mph' } });
    });

    // Verify the store state updated
    const updatedClip = useProjectStore.getState().clips[mockDataClip.id];
    expect(updatedClip.properties.dataOverlay?.speedUnit).toBe('mph');

    // Simulate hiding the speed field
    const showSpeedCheckbox = screen.getByLabelText('Show Speed');
     await act(async () => {
        fireEvent.click(showSpeedCheckbox);
    });


    // Verify the field is no longer displayed
    await waitFor(() => {
        const updatedOverlay = screen.getByTestId('data-overlay');
        expect(within(updatedOverlay).queryByText(/Speed/)).not.toBeInTheDocument();
    });
  });
});
