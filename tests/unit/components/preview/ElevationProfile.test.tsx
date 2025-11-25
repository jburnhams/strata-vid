import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import ElevationProfile from '../../../../src/components/preview/ElevationProfile';
import { Asset, ExtraTrack } from '../../../../src/types';
import { useProjectStore } from '../../../../src/store/useProjectStore';

// Mock the useProjectStore
jest.mock('../../../../src/store/useProjectStore');

const mockAssets: Asset[] = [
  { id: 'gpx1', name: 'Main GPX', type: 'gpx', src: '', duration: 1, gpxPoints: [
    { time: 0, lat: 0, lon: 0, ele: 10, dist: 0 },
    { time: 1000, lat: 1, lon: 1, ele: 20, dist: 100 },
  ]},
  { id: 'gpx2', name: 'Extra GPX', type: 'gpx', src: '', duration: 1, gpxPoints: [
    { time: 0, lat: 0, lon: 0, ele: 30, dist: 0 },
    { time: 500, lat: 0.5, lon: 0.5, ele: 20, dist: 75 },
    { time: 1000, lat: 1, lon: 1, ele: 50, dist: 150 },
  ]},
];

const mockExtraTracks: ExtraTrack[] = [{ assetId: 'gpx2' }];

describe('ElevationProfile', () => {
  beforeEach(() => {
    // JSDOM doesn't implement SVG geometry APIs. We need to mock them.
    if (window.SVGElement.prototype.getScreenCTM === undefined) {
      window.SVGElement.prototype.getScreenCTM = function() {
        const rect = this.getBoundingClientRect();
        return {
          a: 1, b: 0, c: 0, d: 1, e: rect.left, f: rect.top,
          inverse: () => ({
            a: 1, b: 0, c: 0, d: 1, e: -rect.left, f: -rect.top,
            multiply: (pt: any) => pt,
            transformPoint: (pt: any) => ({ x: pt.x - rect.left, y: pt.y - rect.top })
          }),
          multiply: (pt: any) => pt,
          transformPoint: (pt: any) => pt
        } as unknown as DOMMatrix;
      };
    }
    if (window.SVGSVGElement.prototype.createSVGPoint === undefined) {
        window.SVGSVGElement.prototype.createSVGPoint = function() {
            let point = {
                x: 0,
                y: 0,
                matrixTransform: function(matrix: any) {
                    return { x: this.x + matrix.e, y: this.y + matrix.f };
                }
            };
            return point as any;
        }
    }
  });

  it('renders without crashing', () => {
    render(
      <ElevationProfile
        gpxAssets={mockAssets}
        mainAssetId="gpx1"
        extraTracks={[]}
        onSeek={() => {}}
        currentTime={0}
      />
    );
    expect(screen.getByText('Elevation Profile')).toBeInTheDocument();
  });

  it('renders a select dropdown when extra tracks are provided', () => {
    render(
      <ElevationProfile
        gpxAssets={mockAssets}
        mainAssetId="gpx1"
        extraTracks={mockExtraTracks}
        onSeek={() => {}}
        currentTime={0}
      />
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select.children.length).toBe(2);
  });

  it('changes the displayed profile when a different track is selected', () => {
    const { container } = render(
      <ElevationProfile
        gpxAssets={mockAssets}
        mainAssetId="gpx1"
        extraTracks={mockExtraTracks}
        onSeek={() => {}}
        currentTime={0}
      />
    );
    const path1 = container.querySelector('path')?.getAttribute('d');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'gpx2' } });

    const path2 = container.querySelector('path')?.getAttribute('d');
    expect(path1).not.toBe(path2);
  });

  it('calls onSeek with the correct time when clicked', () => {
    const onSeek = jest.fn();
    const { container } = render(
      <ElevationProfile
        gpxAssets={mockAssets}
        mainAssetId="gpx1"
        extraTracks={[]}
        onSeek={onSeek}
        currentTime={0}
      />
    );
    const svg = container.querySelector('svg')!;

    // Simulate a click in the middle of the SVG element
    fireEvent.click(svg, { clientX: 50 });

    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(expect.any(Number));
  });

  it('displays a tooltip on mouse move', async () => {
    const { container } = render(
      <ElevationProfile
        gpxAssets={mockAssets}
        mainAssetId="gpx1"
        extraTracks={[]}
        onSeek={() => {}}
        currentTime={0}
      />
    );
    const svg = container.querySelector('svg')!;

    fireEvent.mouseMove(svg, { clientX: 50 });

    const tooltipDist = await screen.findByText(/Dist:/);
    const tooltipEle = await screen.findByText(/Ele:/);

    expect(tooltipDist).toBeInTheDocument();
    expect(tooltipEle).toBeInTheDocument();
  });
});
