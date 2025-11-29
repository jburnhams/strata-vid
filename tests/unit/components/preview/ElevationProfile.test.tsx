import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ElevationProfile from '../../../../src/components/preview/ElevationProfile';
import { GpxPoint, Asset } from '../../../../src/types';
import '@testing-library/jest-dom';

// Mocks for SVG geometry
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
Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 100 });

describe('ElevationProfile', () => {
  const mockAsset: Asset = {
    id: 'gpx1',
    name: 'test.gpx',
    type: 'gpx',
    source: new File([''], 'test.gpx'),
    gpxPoints: [
        { time: 1000, lat: 10, lon: 10, ele: 100, dist: 0 },
        { time: 2000, lat: 20, lon: 20, ele: 110, dist: 50 },
        { time: 3000, lat: 30, lon: 30, ele: 105, dist: 100 },
    ] as GpxPoint[],
  };

  const mockAsset2: Asset = {
    id: 'gpx2',
    name: 'test2.gpx',
    type: 'gpx',
    source: new File([''], 'test2.gpx'),
    gpxPoints: [
        { time: 1000, lat: 10, lon: 10, ele: 200, dist: 0 },
        { time: 2000, lat: 20, lon: 20, ele: 210, dist: 100 },
    ] as GpxPoint[],
  };

  const requiredProps = {
    gpxAssets: [mockAsset, mockAsset2],
    mainAssetId: 'gpx1',
    extraTracks: [{ assetId: 'gpx2', syncOffset: 0 }],
    onSeek: jest.fn(),
    currentTime: 1.5,
    clipDuration: 10,
  };

  it('renders without crashing', () => {
    render(<ElevationProfile {...requiredProps} />);
    expect(screen.getByText('Elevation Profile')).toBeInTheDocument();
    expect(screen.getByTestId('elevation-profile-svg')).toBeInTheDocument();
  });

  it('calls onSeek when the chart SVG is clicked', () => {
    const onSeek = jest.fn();
    render(<ElevationProfile {...requiredProps} onSeek={onSeek} />);

    const svg = screen.getByTestId('elevation-profile-svg');
    fireEvent.click(svg, { clientX: 50 }); // click middle

    expect(onSeek).toHaveBeenCalled();
  });

  it('displays a tooltip on mouse move and hides on mouse leave', () => {
    render(<ElevationProfile {...requiredProps} />);
    const svg = screen.getByTestId('elevation-profile-svg');

    // Move mouse
    fireEvent.mouseMove(svg, { clientX: 50, clientY: 50 });

    expect(screen.getByText(/Dist:/)).toBeInTheDocument();
    expect(screen.getByText(/Ele:/)).toBeInTheDocument();

    // Leave mouse
    fireEvent.mouseLeave(svg);
    expect(screen.queryByText(/Dist:/)).not.toBeInTheDocument();
  });

  it('allows switching tracks via dropdown', () => {
    render(<ElevationProfile {...requiredProps} />);

    // Initial max elevation from gpx1 (110)
    expect(screen.getByText('110m')).toBeInTheDocument();

    // Select dropdown
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'gpx2' } });

    // gpx2 max elevation is 210
    expect(screen.getByText('210m')).toBeInTheDocument();
  });

  it('handles empty points gracefully', () => {
    const emptyAsset = { ...mockAsset, gpxPoints: [] };
    render(<ElevationProfile {...requiredProps} gpxAssets={[emptyAsset]} mainAssetId="gpx1" />);
    // Should render 0m min/max
    const textItems = screen.getAllByText('0m');
    expect(textItems.length).toBeGreaterThan(0);
  });

  it('handles single point gracefully', () => {
     const singlePointAsset = { ...mockAsset, gpxPoints: [{ time: 0, lat: 0, lon: 0, ele: 10, dist: 0 }] };
     render(<ElevationProfile {...requiredProps} gpxAssets={[singlePointAsset]} mainAssetId="gpx1" />);
     // With < 2 points, it defaults to 0
     const textItems = screen.getAllByText('0m');
     expect(textItems.length).toBeGreaterThan(0);
  });
});
