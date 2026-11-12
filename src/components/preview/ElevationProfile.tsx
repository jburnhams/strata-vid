/**
 * The route's height along its length, on strata-react's LineChart (issue #79): the playhead's
 * place on the route is the chart's current rule, a reading follows the pointer or the arrow keys,
 * and choosing a point seeks the clip there. The chart is drawn in real pixels with every reading in
 * a table for a screen reader, which the hand-drawn SVG (stretched with preserveAspectRatio="none")
 * had none of.
 *
 * The playhead's place on the route is found the way the map's marker finds it: the route's own
 * clock, started at the track's sync offset (or its first point) when the clip starts, at real
 * speed. Until 2026-11-12 the profile instead stretched the whole route over the clip, so it marked
 * 2.6 km while the marker sat at the start (issue #144). A playhead before or after the recording
 * draws no rule. The height axis starts at a round number below the route's lowest point, not at
 * 0 m, so the climb is not drawn flat.
 */
import React, { useMemo, useState } from 'react';
import { Field, LineChart, NativeSelect, format } from 'strata-react';
import type { GpxPoint, Asset, ExtraTrack } from '../../types';

interface ElevationProfileProps {
  gpxAssets: (Asset | undefined)[];
  mainAssetId: string;
  extraTracks: ExtraTrack[];
  onSeek: (time: number) => void;
  /** Seconds into the clip. */
  currentTime: number;
  /** The main route's sync offset: the GPX time (epoch ms) at the clip's start. */
  syncOffset?: number;
}

type Reading = { dist: number; ele: number; time: number };

/** A distance on the axis: metres under a kilometre, kilometres above. */
const formatDistance = (m: number) => (m < 1000 ? `${format.integer(m)} m` : `${format.decimal(m / 1000)} km`);

/** Axis ticks at a step a person would write (1, 2, 2.5 or 5 × 10ⁿ metres), about four of them. */
export const distanceTicks = (total: number): number[] => {
  if (!(total > 0)) return [0];
  const rough = total / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= rough) ?? 10 * mag;
  const ticks: number[] = [];
  for (let t = 0; t <= total + 1e-9; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return ticks;
};

/** Linear interpolation of `to` at `at` along `by`, over readings sorted by `by`. */
const along = (rows: Reading[], by: 'dist' | 'time', at: number, to: 'dist' | 'time'): number => {
  if (rows.length === 0) return 0;
  if (at <= rows[0][by]) return rows[0][to];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    if (b[by] >= at) {
      const span = b[by] - a[by];
      const r = span > 0 ? (at - a[by]) / span : 0;
      return a[to] + (b[to] - a[to]) * r;
    }
  }
  return rows[rows.length - 1][to];
};

/** A round bottom for the height axis, below the lowest reading: a step people write (1, 2, 2.5 or 5 × 10ⁿ m) for about four steps over the range. */
export const heightFloor = (min: number, max: number): number => {
  const rough = Math.max(max - min, 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= rough) ?? 10 * mag;
  return Math.floor(min / step) * step;
};

const ElevationProfile: React.FC<ElevationProfileProps> = ({ gpxAssets, mainAssetId, extraTracks, onSeek, currentTime, syncOffset }) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string>(mainAssetId);
  const selectedAsset = gpxAssets.find(asset => asset?.id === selectedTrackId);

  const rows = useMemo<Reading[]>(
    () => (selectedAsset?.gpxPoints || [])
      .filter((p: GpxPoint) => typeof p.ele === 'number' && typeof p.dist === 'number')
      .map((p: GpxPoint) => ({ dist: p.dist!, ele: p.ele!, time: p.time })),
    [selectedAsset],
  );

  const first = rows[0], last = rows[rows.length - 1];

  // Clip time and distance, both ways, through the route's own clock (as the map's marker does)
  const offset = selectedTrackId === mainAssetId ? syncOffset : extraTracks.find(t => t.assetId === selectedTrackId)?.syncOffset;
  const base = offset || first?.time || 0;
  const gpxTime = base + currentTime * 1000;
  const current = rows.length > 1 && gpxTime >= first.time && gpxTime <= last.time ? along(rows, 'time', gpxTime, 'dist') : undefined;
  const timeAt = (d: number) => (along(rows, 'dist', d, 'time') - base) / 1000;
  const heights = rows.map(r => r.ele);

  return (
    <div className="bg-card text-foreground p-2 grid gap-1">
      <div className="flex justify-between items-center gap-2">
        <h4 className="type-body-sm font-bold">Elevation profile</h4>
        {extraTracks.length > 0 && (
          <Field label="Route" className="flex items-center gap-2">
            <NativeSelect value={selectedTrackId} onChange={e => setSelectedTrackId(e.target.value)}>
              <option value={mainAssetId}>{gpxAssets.find(a => a?.id === mainAssetId)?.name ?? 'Main route'}</option>
              {extraTracks.map(track => (
                <option key={track.assetId} value={track.assetId}>
                  {gpxAssets.find(a => a?.id === track.assetId)?.name || track.assetId}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
      </div>
      {rows.length < 2 ? (
        <p className="type-caption text-muted-foreground">This route has no heights to draw.</p>
      ) : (
        <LineChart
          label={`Elevation along ${selectedAsset?.name ?? 'the route'}`}
          series={rows.map(r => ({ x: r.dist, y: r.ele }))}
          seriesLabel="Elevation"
          formatX={formatDistance}
          formatY={(m) => `${format.integer(m)} m`}
          xTicks={distanceTicks(last.dist)}
          yMin={rows.length > 1 ? heightFloor(Math.min(...heights), Math.max(...heights)) : undefined}
          current={current}
          readout
          onPick={(d) => onSeek(timeAt(d))}
          area
          height={88}
        />
      )}
    </div>
  );
};

export default ElevationProfile;
