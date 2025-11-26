
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ElevationProfile from '../../../../src/components/preview/ElevationProfile';
import { GpxPoint, Asset } from '../../../../src/types';
import '@testing-library/jest-dom';

// This component uses SVG geometry APIs that are not available in JSDOM.
// We need to provide a mock implementation for them.
// @ts-ignore
global.SVGElement.prototype.getScreenCTM = () => {
  return {
    a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
    inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, multiply: () => {}, transformPoint: (pt: any) => pt }),
    multiply: () => {},
    transformPoint: (pt: any) => pt,
  };
};
// @ts-ignore
global.SVGSVGElement.prototype.createSVGPoint = () => ({
  x: 0, y: 0,
  matrixTransform: function() { return { x: this.x, y: this.y }; }
});
// @ts-ignore
global.Element.prototype.getBoundingClientRect = () => ({
    x: 0, y: 0, top: 0, left: 0, bottom: 100, right: 100, width: 100, height: 100,
});


describe('ElevationProfile', () => {
  const mockAsset: Asset = {
    id: 'gpx1',
    name: 'test.gpx',
    type: 'gpx',
    source: new File([''], 'test.gpx'),
    gpxPoints: [
        { time: 1000, lat: 10, lon: 10, ele: 100, dist: 0 },
        { time: 2000, lat: 20, lon: 20, ele: 110, dist: 1573 },
        { time: 3000, lat: 30, lon: 30, ele: 105, dist: 3146 },
    ] as GpxPoint[],
  };

  const requiredProps = {
    gpxAssets: [mockAsset],
    mainAssetId: 'gpx1',
    extraTracks: [],
    onSeek: jest.fn(),
    currentTime: 1.5,
    clipDuration: 10,
  };

  it('renders without crashing', () => {
    render(<ElevationProfile {...requiredProps} />);
    expect(screen.getByText('Elevation Profile')).toBeInTheDocument();
    // Check for the SVG element using the new data-testid
    expect(screen.getByTestId('elevation-profile-svg')).toBeInTheDocument();
  });

  it('calls onSeek when the chart SVG is clicked', () => {
    const onSeek = jest.fn();
    render(<ElevationProfile {...requiredProps} onSeek={onSeek} />);

    const svg = screen.getByTestId('elevation-profile-svg');
    fireEvent.click(svg);

    expect(onSeek).toHaveBeenCalled();
  });

  it('displays a tooltip on mouse move', () => {
    render(<ElevationProfile {...requiredProps} />);
    const svg = screen.getByTestId('elevation-profile-svg');
    fireEvent.mouseMove(svg, { clientX: 50, clientY: 50 });

    // Check for the tooltip text
    expect(screen.getByText(/Dist:/)).toBeInTheDocument();
    expect(screen.getByText(/Ele:/)).toBeInTheDocument();
  });

});
