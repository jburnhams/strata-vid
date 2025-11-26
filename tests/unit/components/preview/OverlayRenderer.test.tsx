
import React from 'react';
import { render, screen } from '@testing-library/react';
import { OverlayRenderer } from '../../../../src/components/preview/OverlayRenderer';
import { Clip, Asset } from '../../../../src/types';

// Mock child components
const mockMapPanel = jest.fn();
jest.mock('../../../../src/components/MapPanel', () => ({
  MapPanel: (props: any) => {
      mockMapPanel(props);
      return <div data-testid="map-panel" />;
  },
}));
jest.mock('../../../../src/components/preview/DataOverlay', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="data-overlay" {...props} />,
}));

const mockTextClip: Clip = {
  id: 'clip1', type: 'text', content: 'Hello World', start: 0, end: 5, trackId: 't1', assetId: 'a1',
  properties: { x: 10, y: 10, width: 80, height: 10, rotation: 0, opacity: 1 },
  textStyle: { fontSize: 24, color: '#ff0000' },
};

const mockImageClip: Clip = {
  id: 'clip2', type: 'image', start: 5, end: 10, trackId: 't1', assetId: 'a2',
  properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
};
const mockImageAsset: Asset = { id: 'a2', name: 'img', type: 'image', src: 'image.png', source: '' };

const mockMapClip: Clip = {
  id: 'clip3', type: 'map', start: 10, end: 20, trackId: 't1', assetId: 'a3',
  properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, mapZoom: 12 },
  syncOffset: 0, extraTrackAssets: [{ assetId: 'a4', syncOffset: 0 }],
};
const mockMapAsset: Asset = { id: 'a3', name: 'map', type: 'gpx', geoJson: { type: 'FeatureCollection', features: [] }, gpxPoints: [], source: '' };
const mockExtraMapAsset: Asset = { id: 'a4', name: 'extra_map', type: 'gpx', geoJson: { type: 'FeatureCollection', features: [] }, gpxPoints: [], source: '' };

const mockDataClip: Clip = {
  id: 'clip4', type: 'data', start: 20, end: 30, trackId: 't1', assetId: 'a3',
  properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 },
};

const allAssets = {
    [mockImageAsset.id]: mockImageAsset,
    [mockMapAsset.id]: mockMapAsset,
    [mockExtraMapAsset.id]: mockExtraMapAsset,
};

describe('OverlayRenderer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

  it('renders a text overlay', () => {
    render(<OverlayRenderer clip={mockTextClip} currentTime={1} />);
    const textElement = screen.getByText('Hello World');
    expect(textElement).toBeInTheDocument();
    expect(textElement).toHaveStyle('color: rgb(255, 0, 0)');
  });

  it('renders an image overlay', () => {
    render(<OverlayRenderer clip={mockImageClip} asset={mockImageAsset} currentTime={6} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'image.png');
  });

  it('renders a map overlay with multiple tracks', () => {
    render(<OverlayRenderer clip={mockMapClip} asset={mockMapAsset} currentTime={12} allAssets={allAssets}/>);
    expect(screen.getByTestId('map-panel')).toBeInTheDocument();
    expect(mockMapPanel).toHaveBeenCalled();
    const mapPanelProps = mockMapPanel.mock.calls[0][0];
    expect(mapPanelProps.tracks).toHaveLength(2);
    expect(mapPanelProps.zoom).toBe(12);
  });

  it('renders a data overlay', () => {
    // Need gpxPoints for getCoordinateAtTime to work
    const assetWithPoints = { ...mockMapAsset, gpxPoints: [{ lat: 0, lon: 0, ele: 0, time: 0 }] };
    render(<OverlayRenderer clip={mockDataClip} asset={assetWithPoints} currentTime={21} />);
    expect(screen.getByTestId('data-overlay')).toBeInTheDocument();
  });

  it('applies crossfade transition', () => {
    const clipWithTransition = { ...mockTextClip, transitionIn: { type: 'crossfade', duration: 2 } };
    const { rerender } = render(<OverlayRenderer clip={clipWithTransition} currentTime={0.5} />);
    // Opacity should be progress * original opacity
    expect(screen.getByText('Hello World').parentElement).toHaveStyle('opacity: 0.25');

    rerender(<OverlayRenderer clip={clipWithTransition} currentTime={1} />);
    expect(screen.getByText('Hello World').parentElement).toHaveStyle('opacity: 0.5');
  });

  it('applies wipe transition', () => {
    const clipWithTransition = { ...mockTextClip, transitionIn: { type: 'wipe', duration: 2 } };
    render(<OverlayRenderer clip={clipWithTransition} currentTime={1} />);
    expect(screen.getByText('Hello World').parentElement).toHaveStyle('clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%)');
  });

  it('applies keyframe animations', () => {
    const clipWithKeyframes = { ...mockTextClip, keyframes: {
        opacity: [{ id: 'k1', time: 0, value: 0 }, { id: 'k2', time: 2, value: 1 }],
    }};
    render(<OverlayRenderer clip={clipWithKeyframes} currentTime={1} />);
    expect(screen.getByText('Hello World').parentElement).toHaveStyle('opacity: 0.5');
  });
});
