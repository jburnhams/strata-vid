
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
    syncOffset: 1000,
  };

  const mockAsset = {
    id: 'asset-1',
    type: 'gpx',
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

  it('renders sync control', () => {
    render(<MapSyncControl clipId="clip-1" />);
    expect(screen.getByText('Synchronization')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
  });

  it('updates offset on button click', () => {
    render(<MapSyncControl clipId="clip-1" />);
    const input = screen.getByDisplayValue('1000');
    fireEvent.change(input, { target: { value: '2000' } });

    const setButton = screen.getByText('Set');
    fireEvent.click(setButton);

    expect(mockUpdateClipSyncOffset).toHaveBeenCalledWith('clip-1', 2000);
  });

  it('auto syncs using video creation time', () => {
    render(<MapSyncControl clipId="clip-1" />);
    const autoButton = screen.getByText('Auto-Sync to Video Metadata');
    fireEvent.click(autoButton);

    // Should call with video creation time (epoch)
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
