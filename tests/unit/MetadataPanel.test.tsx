import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MetadataPanel } from '../../src/components/MetadataPanel';
import { Asset } from '../../src/types';
import { useProjectStore } from '../../src/store/useProjectStore';

// Mock MapSyncControl to simplify test
jest.mock('../../src/components/MapSyncControl', () => ({
    MapSyncControl: () => <div data-testid="map-sync-control">Map Sync Control</div>
}));

describe('MetadataPanel', () => {
  beforeEach(() => {
    useProjectStore.setState({
        selectedClipId: null,
        clips: {},
        selectedAssetId: null
    });
  });

  it('renders empty state', () => {
    render(<MetadataPanel activeAsset={null} />);
    expect(screen.getByText('Select an asset to view details')).toBeInTheDocument();
  });

  it('renders asset details', () => {
    const asset: Asset = { id: '1', name: 'test.mp4', type: 'video', src: 'blob:x' };
    render(<MetadataPanel activeAsset={asset} />);
    expect(screen.getByText('test.mp4')).toBeInTheDocument();
    expect(screen.getByText('video')).toBeInTheDocument();
  });

  it('renders GPX stats', () => {
    const asset: Asset = {
        id: '1', name: 'run.gpx', type: 'gpx', src: 'blob:z',
        stats: {
            distance: { total: 5000 },
            elevation: { gain: 100, loss: 100, max: 200, min: 100, average: 150 },
            time: { start: new Date(), end: new Date(), duration: 1800000 } // 30 mins
        }
    };

    render(<MetadataPanel activeAsset={asset} />);

    expect(screen.getByText('GPX Statistics')).toBeInTheDocument();
    expect(screen.getByText('5.00 km')).toBeInTheDocument();
    expect(screen.getByText('100 m')).toBeInTheDocument();
    expect(screen.getByText('00:30:00')).toBeInTheDocument();
  });

  it('renders Clip Properties when a clip is selected', () => {
      const clip = {
          id: 'clip-1',
          assetId: 'asset-1',
          trackId: 'track-1',
          start: 0,
          duration: 10,
          offset: 0,
          type: 'video' as const,
          properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }
      };

      useProjectStore.setState({
          selectedClipId: 'clip-1',
          clips: { 'clip-1': clip }
      });

      render(<MetadataPanel activeAsset={null} />);

      expect(screen.getByText('Clip Properties')).toBeInTheDocument();
      expect(screen.getByText('Opacity')).toBeInTheDocument();
      expect(screen.getByText('Rotation')).toBeInTheDocument();
  });

  it('renders Map Styling controls when a map clip is selected', () => {
      const clip = {
          id: 'clip-map',
          assetId: 'asset-map',
          trackId: 'track-1',
          start: 0,
          duration: 10,
          offset: 0,
          type: 'map' as const,
          properties: {
              x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0,
              mapZoom: 13,
              mapStyle: 'osm',
              trackStyle: { color: '#007acc', weight: 4 },
              markerStyle: { color: 'red' }
          }
      };

      useProjectStore.setState({
          selectedClipId: 'clip-map',
          clips: { 'clip-map': clip }
      });

      render(<MetadataPanel activeAsset={null} />);

      expect(screen.getByText('Map Styling')).toBeInTheDocument();
      expect(screen.getByTestId('map-sync-control')).toBeInTheDocument();

      // Test interactions
      const zoomInput = screen.getByLabelText(/Zoom Level/);
      fireEvent.change(zoomInput, { target: { value: '15' } });
      expect(useProjectStore.getState().clips['clip-map'].properties.mapZoom).toBe(15);

      const styleSelect = screen.getByLabelText(/Map Style/);
      fireEvent.change(styleSelect, { target: { value: 'mapbox' } });
      expect(useProjectStore.getState().clips['clip-map'].properties.mapStyle).toBe('mapbox');

      const colorInput = screen.getByLabelText(/Track Color/);
      fireEvent.change(colorInput, { target: { value: '#ff0000' } });
      expect(useProjectStore.getState().clips['clip-map'].properties.trackStyle?.color).toBe('#ff0000');

      const widthInput = screen.getByLabelText(/Track Width/);
      fireEvent.change(widthInput, { target: { value: '8' } });
      expect(useProjectStore.getState().clips['clip-map'].properties.trackStyle?.weight).toBe(8);

      const markerColorInput = screen.getByLabelText(/Marker Color/);
      fireEvent.change(markerColorInput, { target: { value: '#00ff00' } });
      expect(useProjectStore.getState().clips['clip-map'].properties.markerStyle?.color).toBe('#00ff00');
  });
});
