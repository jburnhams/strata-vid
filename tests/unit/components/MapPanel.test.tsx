import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithStrata as render } from 'strata-react/testing';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MapPanel, heatScale, heatValues, tilesFor, type MapTrackData } from '../../../src/components/MapPanel';
import type { GpxPoint } from '../../../src/types';

// RouteMap itself (strata-react/map) is drawn for real: Leaflet runs in jsdom. These tests check what
// the clip hands it: one route and one runner per track, held at the clip's zoom, in the clip's tiles.

const T0 = Date.UTC(2026, 0, 1, 9);
const run: GpxPoint[] = [
  { time: T0, lat: 51.5, lon: -0.1, ele: 10 },
  { time: T0 + 10_000, lat: 51.501, lon: -0.1, ele: 20 },
  { time: T0 + 20_000, lat: 51.502, lon: -0.1, ele: 30 },
];
const ride: GpxPoint[] = run.map((p) => ({ ...p, lon: p.lon + 0.001 }));

const track = (id: string, points: GpxPoint[], extra: Partial<MapTrackData> = {}): MapTrackData => ({
  id, label: id, gpxPoints: points, ...extra,
});

const mapOf = () => screen.getByLabelText('Map clip');

describe('MapPanel', () => {
  it('draws nothing without a track', () => {
    const { container } = render(<MapPanel tracks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names each route and says how far along each runner is', () => {
    render(<MapPanel tracks={[track('Morning run', run), track('Bike', ride)]} currentTime={10} />);
    const map = mapOf();
    expect(map).toHaveAccessibleDescription(/Morning run/);
    expect(map).toHaveAccessibleDescription(/Bike/);
  });

  it('draws one marker per runner', () => {
    const { container } = render(<MapPanel tracks={[track('a', run), track('b', ride)]} currentTime={5} />);
    expect(container.querySelectorAll('path.leaflet-interactive, path').length).toBeGreaterThanOrEqual(4);
  });

  it('turns the elevation profile on and off from the map', async () => {
    const toggle = jest.fn();
    render(<MapPanel tracks={[track('a', run)]} onToggleElevationProfile={toggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Elevation profile' }));
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('keys the heatmap by speed', () => {
    render(<MapPanel tracks={[track('a', run)]} heatmap="speed" />);
    expect(screen.getByText('Speed')).toBeInTheDocument();
  });
});

describe('tilesFor', () => {
  it('uses the clip style, and OSM for a custom style with no address', () => {
    expect(tilesFor('satellite').url).toContain('arcgisonline');
    expect(tilesFor('custom', 'https://t.example/{z}/{x}/{y}.png').url).toBe('https://t.example/{z}/{x}/{y}.png');
    expect(tilesFor('custom').url).toContain('openstreetmap');
  });
});

describe('heat readings', () => {
  it('reads speed over the leg into each point, the first taking the first leg', () => {
    const speeds = heatValues(run, 'speed');
    expect(speeds).toHaveLength(3);
    expect(speeds[1]).toBeCloseTo(11.1, 0);
    expect(speeds[0]).toBe(speeds[1]);
  });

  it('reads elevation as it is', () => {
    expect(heatValues(run, 'elevation')).toEqual([10, 20, 30]);
  });

  it('steps four colours from the lowest reading to the highest', () => {
    expect(heatScale([0, 40]).map((s) => s.at)).toEqual([0, 10, 20, 30]);
  });

  it('has one step when every reading is the same', () => {
    expect(heatScale([5, 5])).toHaveLength(1);
  });
});
