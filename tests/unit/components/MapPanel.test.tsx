import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithStrata as render } from 'strata-react/testing';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MapPanel, heatScale, heatValues, routeLines, tilesFor, type MapTrackData } from '../../../src/components/MapPanel';
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
const mapText = () => document.getElementById(mapOf().getAttribute('aria-describedby') ?? '')?.textContent ?? '';

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

describe('routeLines', () => {
  const line = (lon: number) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [[lon, 51], [lon, 52]] } });
  const twoTracks = { type: 'FeatureCollection' as const, features: [line(0), line(1)] };

  it('keeps every track in a file, the timed one first', () => {
    const lines = routeLines({ id: 'a', label: 'a', gpxPoints: run, geoJson: twoTracks });
    expect(lines).toHaveLength(2);
    expect(lines[0][0]).toEqual([run[0].lat, run[0].lon]);
    expect(lines[1]).toEqual([[51, 1], [52, 1]]);
  });

  it('draws the file\'s lines when it has no timed points', () => {
    const multi = { type: 'FeatureCollection' as const, features: [{ type: 'Feature' as const, properties: {}, geometry: { type: 'MultiLineString' as const, coordinates: [[[0, 51], [0, 52]], [[2, 51], [2, 52]]] } }] };
    expect(routeLines({ id: 'a', label: 'a', geoJson: multi })).toHaveLength(2);
  });

  it('names a second track of one file as a part of it', () => {
    render(<MapPanel tracks={[{ id: 'a', label: 'Ridge', gpxPoints: run, geoJson: twoTracks }]} />);
    expect(mapText()).toMatch(/Ridge, part 2/);
  });
});
