import React from 'react';
import { render } from '@testing-library/react';
import { OverlayRenderer } from '../../../../src/components/preview/OverlayRenderer';
import { Clip, Asset } from '../../../../src/types';

// Mock MapPanel since it uses Leaflet which requires window/canvas mocks
jest.mock('../../../../src/components/MapPanel', () => ({
  MapPanel: () => <div data-testid="map-panel" />
}));

describe('OverlayRenderer', () => {
  const baseClip: Clip = {
    id: 'clip1',
    assetId: 'asset1',
    trackId: 'track1',
    start: 0,
    duration: 10,
    offset: 0,
    type: 'text',
    properties: { x: 10, y: 10, width: 50, height: 50, rotation: 0, opacity: 0.5, zIndex: 2 }
  };

  it('renders text overlay', () => {
    const clip = { ...baseClip, type: 'text' as const, content: 'Hello World' };
    const { getByText, container } = render(
      <OverlayRenderer clip={clip} currentTime={0} />
    );
    expect(getByText('Hello World')).toBeInTheDocument();

    // Check styles
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveStyle('left: 10%');
    expect(div).toHaveStyle('opacity: 0.5');
  });

  it('renders image overlay', () => {
    const clip = { ...baseClip, type: 'image' as const };
    const asset: Asset = { id: 'a1', name: 'img.png', type: 'image', src: 'img.png' };

    const { getByAltText } = render(
      <OverlayRenderer clip={clip} asset={asset} currentTime={0} />
    );
    const img = getByAltText('clip1');
    expect(img).toHaveAttribute('src', 'img.png');
  });

  it('renders map overlay', () => {
    const clip = { ...baseClip, type: 'map' as const };
    const asset: Asset = {
        id: 'a1',
        name: 'track.gpx',
        type: 'gpx',
        src: 'track.gpx',
        geoJson: { type: 'FeatureCollection', features: [] }
    };

    const { getByTestId } = render(
      <OverlayRenderer clip={clip} asset={asset} currentTime={0} />
    );
    expect(getByTestId('map-panel')).toBeInTheDocument();
  });
});
