import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { installLayoutShims } from 'strata-react/testing';
import ElevationProfile, { distanceTicks, heightFloor } from '../../../../src/components/preview/ElevationProfile';
import type { GpxPoint, Asset } from '../../../../src/types';

describe('ElevationProfile', () => {
  let restore: () => void;
  beforeAll(() => { restore = installLayoutShims({ width: 400, height: 120 }); });
  afterAll(() => restore());

  const mockAsset: Asset = {
    id: 'gpx1',
    name: 'test.gpx',
    type: 'gpx',
    src: '',
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
    src: '',
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
    currentTime: 1,
  };

  it('draws the route as a chart named for it, with every reading in a table', () => {
    render(<ElevationProfile {...requiredProps} />);
    expect(screen.getByRole('heading', { name: 'Elevation profile' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Elevation along test.gpx' })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Elevation along test.gpx' });
    expect(within(table).getByText(/^110\sm$/)).toBeInTheDocument();
  });

  it('seeks the clip to the reading chosen by keyboard', () => {
    const onSeek = jest.fn();
    render(<ElevationProfile {...requiredProps} onSeek={onSeek} />);

    const reader = screen.getByRole('slider', { name: 'Elevation along test.gpx: read values' });
    fireEvent.keyDown(reader, { key: 'End' });
    fireEvent.keyDown(reader, { key: 'Enter' });

    // The last reading is 2 s after the route's first point, which is the clip's start (no sync offset)
    expect(onSeek).toHaveBeenCalledWith(2);
  });

  it('switches to another route', () => {
    render(<ElevationProfile {...requiredProps} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Route' }), { target: { value: 'gpx2' } });
    expect(screen.getByRole('img', { name: 'Elevation along test2.gpx' })).toBeInTheDocument();
  });

  it('says so when the route has no heights', () => {
    const flat: Asset = { ...mockAsset, gpxPoints: [{ time: 0, lat: 0, lon: 0, dist: 0 } as GpxPoint] };
    render(<ElevationProfile {...requiredProps} gpxAssets={[flat]} extraTracks={[]} />);
    expect(screen.getByText('This route has no heights to draw.')).toBeInTheDocument();
  });

  it("marks the playhead where the map's marker is: the route's clock from the clip's start, at real speed", () => {
    const { container, rerender } = render(<ElevationProfile {...requiredProps} currentTime={1} />);
    // 1 s in is the second point: 50 m along, 110 m up
    expect(container).toHaveTextContent(/50\sm: 110\sm/);

    // A sync offset of 1500 ms puts the clip's start half a second into the recording: 0.5 s in is the second point again
    rerender(<ElevationProfile {...requiredProps} syncOffset={1500} currentTime={0.5} />);
    expect(container).toHaveTextContent(/50\sm: 110\sm/);
  });

  it('draws no rule when the playhead is outside the recording', () => {
    const { container } = render(<ElevationProfile {...requiredProps} currentTime={30} />);
    expect(container).not.toHaveTextContent(/\d\sm: \d+\sm/);
  });

  it('starts the height axis at a round number below the route, not at zero', () => {
    expect(heightFloor(215, 429)).toBe(200);
    expect(heightFloor(1203, 1260)).toBe(1200);
    expect(heightFloor(-20, 15)).toBe(-20);
  });

  it('puts distance ticks at round steps', () => {
    expect(distanceTicks(100)).toEqual([0, 25, 50, 75, 100]);
    expect(distanceTicks(4300)).toEqual([0, 2000, 4000]);
  });
});
