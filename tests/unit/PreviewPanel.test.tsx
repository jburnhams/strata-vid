import React from 'react';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '../../src/components/PreviewPanel';
import { Asset } from '../../src/types';

// Mock MapPanel
jest.mock('../../src/components/MapPanel', () => ({
    MapPanel: (props: any) => <div data-testid="map-panel">MapPanel {props.geoJson ? 'with GeoJSON' : ''}</div>
}));

describe('PreviewPanel', () => {
  it('renders empty state', () => {
    render(<PreviewPanel activeAsset={null} />);
    expect(screen.getByText('Select a file to preview')).toBeInTheDocument();
  });

  it('renders video player for video asset', () => {
    const asset: Asset = { id: '1', name: 'test.mp4', type: 'video', src: 'blob:x' };
    render(<PreviewPanel activeAsset={asset} />);
    // Check for video element
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'blob:x');
    // Check for overlay map (empty placeholder)
    // Wait, logic says if no overlayAsset, it shows default MapPanel (no geoJson)
    expect(screen.getByTestId('map-panel')).toBeInTheDocument();
    expect(screen.queryByText('with GeoJSON')).toBeNull();
  });

  it('renders map for gpx asset', () => {
    const asset: Asset = {
        id: '2', name: 'test.gpx', type: 'gpx', src: 'blob:y',
        geoJson: { type: 'FeatureCollection', features: [] } as any
    };
    render(<PreviewPanel activeAsset={asset} />);
    expect(screen.getByTestId('map-panel')).toBeInTheDocument();
    expect(screen.getByText('MapPanel with GeoJSON')).toBeInTheDocument();
  });

  it('renders video with GPX overlay', () => {
      const videoAsset: Asset = { id: '1', name: 'test.mp4', type: 'video', src: 'blob:x' };
      const gpxAsset: Asset = {
          id: '2', name: 'test.gpx', type: 'gpx', src: 'blob:y',
          geoJson: { type: 'FeatureCollection', features: [] } as any
      };

      render(<PreviewPanel activeAsset={videoAsset} overlayAsset={gpxAsset} />);
      expect(screen.getByTestId('map-panel')).toBeInTheDocument();
      expect(screen.getByText('MapPanel with GeoJSON')).toBeInTheDocument();
  });
});
