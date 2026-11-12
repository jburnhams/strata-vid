
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapSyncControl } from '../../../src/components/MapSyncControl';
import { useProjectStore } from '../../../src/store/useProjectStore';
import '@testing-library/jest-dom';

// Mock the store
jest.mock('../../../src/store/useProjectStore');

describe('MapSyncControl', () => {
  const mockUpdateClipSyncOffset = jest.fn();

  const mockClip = {
    id: 'clip-1',
    assetId: 'asset-1',
    type: 'map',
    // The clip starts 90 s into the route
    syncOffset: Date.parse('2023-01-01T10:01:30Z'),
  };

  const mockAsset = {
    id: 'asset-1',
    type: 'gpx',
    gpxPoints: [{ time: Date.parse('2023-01-01T10:00:00Z'), lat: 0, lon: 0 }],
    stats: {
      time: {
        start: new Date('2023-01-01T10:00:00Z'),
      }
    }
  };

  const mockVideoClip = {
    id: 'video-1',
    assetId: 'video-asset-1',
    type: 'video',
    offset: 0
  };

  const mockVideoAsset = {
    id: 'video-asset-1',
    type: 'video',
    name: 'video.mp4',
    creationTime: new Date('2023-01-01T10:00:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useProjectStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        clips: { 'clip-1': mockClip, 'video-1': mockVideoClip },
        assets: { 'asset-1': mockAsset, 'video-asset-1': mockVideoAsset },
        updateClipSyncOffset: mockUpdateClipSyncOffset,
        currentTime: 0,
      };
      return selector(state);
    });
  });

  it('writes the dates as the inspector does, and the offset as seconds into the route, labelled', () => {
    render(<MapSyncControl clipId="clip-1" />);
    expect(screen.getByText('Route starts')).toBeInTheDocument();
    expect(screen.getByText('video.mp4 recorded')).toBeInTheDocument();
    const field = screen.getByRole('textbox', { name: 'Clip starts into the route' });
    expect(field).toHaveValue('90');
  });

  it('stores the seconds typed as the route time at the clip start', () => {
    render(<MapSyncControl clipId="clip-1" />);
    const field = screen.getByRole('textbox', { name: 'Clip starts into the route' });
    fireEvent.change(field, { target: { value: '120' } });
    fireEvent.blur(field);
    expect(mockUpdateClipSyncOffset).toHaveBeenCalledWith('clip-1', Date.parse('2023-01-01T10:02:00Z'));
  });

  it("matches the footage's recorded time", () => {
    render(<MapSyncControl clipId="clip-1" />);
    fireEvent.click(screen.getByRole('button', { name: "Match video.mp4's recorded time" }));
    expect(mockUpdateClipSyncOffset).toHaveBeenCalledWith('clip-1', mockVideoAsset.creationTime.getTime());
  });

  it('renders nothing if clip is not found or not map', () => {
    (useProjectStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        clips: {},
        assets: {},
        updateClipSyncOffset: mockUpdateClipSyncOffset,
      };
      return selector(state);
    });

    const { container } = render(<MapSyncControl clipId="clip-1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
