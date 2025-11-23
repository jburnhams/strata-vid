import { Feature, Geometry, LineString } from 'geojson';

export const TILE_SIZE = 256;

/**
 * Converts longitude to tile X coordinate
 */
export const lon2tile = (lon: number, zoom: number): number => {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
};

/**
 * Converts latitude to tile Y coordinate
 */
export const lat2tile = (lat: number, zoom: number): number => {
  return (
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
    Math.pow(2, zoom)
  );
};

/**
 * Converts tile X to longitude
 */
export const tile2lon = (x: number, zoom: number): number => {
  return (x / Math.pow(2, zoom)) * 360 - 180;
};

/**
 * Converts tile Y to latitude
 */
export const tile2lat = (y: number, zoom: number): number => {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

/**
 * Get the URL for an OSM tile
 */
export const getTileUrl = (x: number, y: number, z: number): string => {
  const s = 'abc'[Math.abs(x + y) % 3]; // simplified subdomain selection
  // Use Math.floor for integer tile indices
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  return `https://${s}.tile.openstreetmap.org/${z}/${tx}/${ty}.png`;
};

/**
 * Interpolate position on a LineString at a given relative time (seconds from start)
 */
export const getGpxPositionAtTime = (
  feature: Feature<Geometry, any>,
  offsetSeconds: number
): [number, number] | null => {
  if (feature.geometry.type !== 'LineString') return null;
  const geometry = feature.geometry as LineString;
  const coords = geometry.coordinates;
  const props = feature.properties;

  if (!props || !props.coordTimes || props.coordTimes.length !== coords.length) {
    // Fallback: If no times, just return start or interpolate by distance (not implemented)
    // Return first point if available
    return coords.length > 0 ? (coords[0] as [number, number]) : null;
  }

  const times = props.coordTimes.map((t: string) => new Date(t).getTime());
  const startTime = times[0];
  const targetTime = startTime + offsetSeconds * 1000;

  if (targetTime <= startTime) return coords[0] as [number, number];
  if (targetTime >= times[times.length - 1]) return coords[coords.length - 1] as [number, number];

  // Binary search or linear scan
  for (let i = 0; i < times.length - 1; i++) {
    if (targetTime >= times[i] && targetTime < times[i + 1]) {
      const t1 = times[i];
      const t2 = times[i + 1];
      const ratio = (targetTime - t1) / (t2 - t1);

      const p1 = coords[i];
      const p2 = coords[i + 1];

      const lat = p1[1] + (p2[1] - p1[1]) * ratio;
      const lon = p1[0] + (p2[0] - p1[0]) * ratio;

      return [lon, lat]; // GeoJSON is [lon, lat]
    }
  }

  return coords[0] as [number, number];
};
