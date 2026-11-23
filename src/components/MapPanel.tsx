/**
 * The map clip in the preview: its routes, a marker on each runner and, when asked, the elevation
 * profile beneath. Drawn by strata-react's `RouteMap` (issue #80, then #161 for picture content).
 *
 * The preview draws what the export draws (WorkerCompositor.drawMap). The view is held centred on the
 * first route's runner at the clip's zoom (`follow="centre"`, `zoom`), not fitted to the route. Each
 * route has its own marker in its marker colour, and there are no direction chevrons or start and finish
 * marks, because the export draws none. Until 2026-11-23 a react-leaflet panel fitted the whole route
 * and ignored the zoom, so preview and export showed different pictures. The tiles are the clip's map
 * style in both schemes (`dark` is the same set), because the map is part of the picture, not the app.
 *
 * The heatmap (preview only, as before) is the first route coloured by speed or elevation in four
 * steps through `values` and `colourScale`, with RouteMap's key naming them. It used to be a hand-made
 * canvas layer under a continuous gradient.
 */
import React, { useMemo } from 'react';
import { Mountain } from 'lucide-react';
import { Toggle } from 'strata-react';
import { RouteMap, type MapPosition, type MapRoute, type TileSource } from 'strata-react/map';
import ElevationProfile from './preview/ElevationProfile';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import type { GpxPoint, TrackStyle, MarkerStyle, Asset, ExtraTrack } from '../types';
import { getCoordinateAtTime, haversineDistance } from '../utils/gpxParser';

export interface MapTrackData {
  /** Stable id for the route and its marker (the asset's id). */
  id: string;
  /** Its name, in the map's text alternative. */
  label: string;
  geoJson?: FeatureCollection<Geometry, GeoJsonProperties>;
  gpxPoints?: GpxPoint[];
  syncOffset?: number;
  trackStyle?: TrackStyle;
  markerStyle?: MarkerStyle;
}

export type MapStyle = 'osm' | 'mapbox' | 'satellite' | 'dark' | 'custom';

interface MapPanelProps {
  className?: string;
  /** Seconds of the route since the clip's sync point (routeClock). */
  currentTime?: number;
  tracks: MapTrackData[];
  /** The clip's zoom; the export's default is 13. */
  zoom?: number;
  mapStyle?: MapStyle;
  customMapStyleUrl?: string;
  /** Colour the first route by this reading. */
  heatmap?: 'speed' | 'elevation';
  showElevationProfile?: boolean;
  onToggleElevationProfile?: () => void;
  onSeek?: (time: number) => void;
  gpxAssets?: (Asset | undefined)[];
  mainAssetId?: string;
  extraTracks?: ExtraTrack[];
}

const OSM: TileSource = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

export const TILE_PROVIDERS: Record<Exclude<MapStyle, 'custom'>, TileSource> = {
  osm: OSM,
  // No Mapbox token: OSM stands in, as it always has.
  mapbox: OSM,
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

export function tilesFor(mapStyle: MapStyle = 'osm', customUrl?: string): TileSource {
  if (mapStyle === 'custom') return customUrl ? { url: customUrl, attribution: 'Custom tiles' } : OSM;
  return TILE_PROVIDERS[mapStyle] ?? OSM;
}

const DEFAULT_ROUTE_COLOUR = '#007acc';
const DEFAULT_MARKER_COLOUR = 'red';
const HEAT_COLOURS = ['#0000ff', '#00ff00', '#ffff00', '#ff0000'];

type Line = [number, number][];

/** Every line in a file's GeoJSON (a file can hold several tracks), as [lat, lon] points. */
export function linesOf(geoJson: MapTrackData['geoJson']): Line[] {
  const lines: Line[] = [];
  for (const feature of geoJson?.features ?? []) {
    const g = feature.geometry;
    if (g?.type === 'LineString') lines.push(g.coordinates.map(([lon, lat]) => [lat, lon]));
    else if (g?.type === 'MultiLineString') g.coordinates.forEach((part) => lines.push(part.map(([lon, lat]) => [lat, lon])));
  }
  return lines;
}

/**
 * A file's lines: the first is its timed track (`gpxPoints`, which the runner follows and the heatmap
 * colours) when there is one, and every other line in the file follows it. The old Leaflet panel drew
 * the whole GeoJSON, so a file with several tracks keeps them all.
 */
export function routeLines(track: MapTrackData): Line[] {
  const lines = linesOf(track.geoJson);
  if (!track.gpxPoints?.length) return lines;
  return [track.gpxPoints.map((p) => [p.lat, p.lon]), ...lines.slice(1)];
}

/** One reading per point: speed in m/s over the leg into it (the first point takes the first leg's), or elevation in metres. */
export function heatValues(points: GpxPoint[], reading: 'speed' | 'elevation'): number[] {
  if (reading === 'elevation') return points.map((p) => p.ele ?? 0);
  const speeds = points.map((p, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    const seconds = (p.time - prev.time) / 1000;
    return seconds > 0 ? haversineDistance(prev.lat, prev.lon, p.lat, p.lon) / seconds : 0;
  });
  if (speeds.length > 1) speeds[0] = speeds[1];
  return speeds;
}

/** Four equal steps from the lowest reading to the highest, blue to red; one step when every reading is the same. */
export function heatScale(values: readonly number[]): { at: number; colour: string }[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return [{ at: min, colour: HEAT_COLOURS[HEAT_COLOURS.length - 1] }];
  const step = (max - min) / HEAT_COLOURS.length;
  return HEAT_COLOURS.map((colour, i) => ({ at: min + step * i, colour }));
}

export const MapPanel: React.FC<MapPanelProps> = ({
  className,
  currentTime = 0,
  tracks,
  zoom = 13,
  mapStyle = 'osm',
  customMapStyleUrl,
  heatmap,
  showElevationProfile,
  onToggleElevationProfile,
  onSeek,
  gpxAssets = [],
  mainAssetId = '',
  extraTracks = [],
}) => {
  const tiles = useMemo(() => {
    const source = tilesFor(mapStyle, customMapStyleUrl);
    return { light: source, dark: source };
  }, [mapStyle, customMapStyleUrl]);

  const heat = useMemo(() => {
    const first = tracks[0]?.gpxPoints;
    if (!heatmap || !first || first.length < 2) return null;
    const values = heatValues(first, heatmap);
    return { values, scale: heatScale(values) };
  }, [tracks, heatmap]);

  // Rebuilt only when the tracks or their styles change, never as the runner moves.
  const routes = useMemo<MapRoute[]>(
    () =>
      tracks.flatMap((track, i) =>
        routeLines(track).map((points, n) => ({
          // The first line keeps the track's id, so its runner (`routeId`) is on it.
          id: n === 0 ? track.id : `${track.id}:${n}`,
          label: n === 0 ? track.label : `${track.label}, part ${n + 1}`,
          points,
          colour: track.trackStyle?.color || DEFAULT_ROUTE_COLOUR,
          weight: track.trackStyle?.weight || 4,
          arrows: false,
          ends: false,
          ...(i === 0 && n === 0 && heat ? { values: heat.values } : {}),
        })),
      ),
    [tracks, heat],
  );

  const positions = useMemo<MapPosition[]>(
    () =>
      tracks.map((track) => {
        const points = track.gpxPoints;
        const base = track.syncOffset || points?.[0]?.time || 0;
        const at = points?.length ? getCoordinateAtTime(points, base + currentTime * 1000) : null;
        return {
          id: track.id,
          label: track.label,
          routeId: track.id,
          colour: track.markerStyle?.color || DEFAULT_MARKER_COLOUR,
          at: at ? ([at.lat, at.lon] as const) : null,
        };
      }),
    [tracks, currentTime],
  );

  if (routes.length === 0) return null;

  return (
    <div className={`${className ?? ''} flex flex-col`} style={{ height: '100%', width: '100%' }}>
      <RouteMap
        label="Map clip"
        className="min-h-0 flex-1 aspect-auto rounded-none border-0"
        routes={routes}
        tiles={tiles}
        positions={positions}
        followId={tracks[0]?.id}
        follow="centre"
        zoom={zoom}
        colourScale={heat?.scale}
        colourScaleLabel={heatmap === 'elevation' ? 'Elevation' : 'Speed'}
        formatValue={(v) => (heatmap === 'elevation' ? `${Math.round(v)} m` : `${Math.round(v * 3.6)} km/h`)}
        topEnd={
          onToggleElevationProfile ? (
            <Toggle
              label="Elevation profile"
              icon={Mountain}
              iconOnly
              size="sm"
              pressed={Boolean(showElevationProfile)}
              onChange={() => onToggleElevationProfile()}
            />
          ) : undefined
        }
      />
      {showElevationProfile && onSeek && (
        <div style={{ flex: '0 0 auto', height: '120px' }}>
          <ElevationProfile
            gpxAssets={gpxAssets}
            mainAssetId={mainAssetId}
            extraTracks={extraTracks}
            onSeek={onSeek}
            currentTime={currentTime}
            syncOffset={tracks[0]?.syncOffset}
          />
        </div>
      )}
    </div>
  );
};
