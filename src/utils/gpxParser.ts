import { parseGPX } from '@we-gold/gpxjs';
import { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { GpxStats, GpxPoint } from '../types';

export const parseGpxFile = async (file: File): Promise<{ geoJson: FeatureCollection<Geometry, GeoJsonProperties>; stats: GpxStats | undefined; points: GpxPoint[] }> => {
  const text = await file.text();
  const [parsedGpx, error] = parseGPX(text);

  if (error) {
    throw new Error(`Error parsing GPX: ${error.message}`);
  }

  if (!parsedGpx) {
    throw new Error('No GPX data found');
  }

  const geoJson = parsedGpx.toGeoJSON();

  let stats: GpxStats | undefined;
  let points: GpxPoint[] = [];

  if (parsedGpx.tracks.length > 0) {
    // Use the first track for stats for now
    const track = parsedGpx.tracks[0];

    // Calculate time stats manually as the library sometimes fails to aggregate them correctly
    let startTime = new Date();
    let endTime = new Date();
    let duration = 0;

    if (track.points.length > 0) {
      const firstPoint = track.points[0];
      const lastPoint = track.points[track.points.length - 1];

      if (firstPoint.time && lastPoint.time) {
        startTime = firstPoint.time;
        endTime = lastPoint.time;
        duration = endTime.getTime() - startTime.getTime();
      }

      // Flatten points
      points = track.points.map(p => ({
        time: p.time ? p.time.getTime() : 0,
        lat: p.latitude,
        lon: p.longitude,
        ele: p.elevation ?? undefined
      })).filter(p => p.time !== 0); // Filter out points without time

    } else {
        // Fallback to library values if no points (unlikely for a valid track)
        startTime = track.duration.startTime ?? new Date();
        endTime = track.duration.endTime ?? new Date();
        duration = (track.duration.totalDuration || 0) * 1000;
    }

    stats = {
      distance: {
        total: track.distance.total,
      },
      elevation: {
        gain: track.elevation.positive ?? 0,
        loss: track.elevation.negative ?? 0,
        max: track.elevation.maximum ?? 0,
        min: track.elevation.minimum ?? 0,
        average: track.elevation.average ?? 0,
      },
      time: {
        start: startTime,
        end: endTime,
        duration: duration,
      },
    };
  }

  // Cast the library's GeoJSON type to the standard GeoJSON FeatureCollection
  return {
    geoJson: geoJson as unknown as FeatureCollection<Geometry, GeoJsonProperties>,
    stats,
    points
  };
};

/**
 * Finds the coordinate and other data at a specific timestamp using linear interpolation.
 * Assumes points are sorted by time.
 */
export const getCoordinateAtTime = (points: GpxPoint[], time: number): GpxPoint | null => {
  if (!points || points.length === 0) {
    return null;
  }

  // Edge cases: time outside range
  if (time <= points[0].time) {
    return points[0];
  }

  if (time >= points[points.length - 1].time) {
    return points[points.length - 1];
  }

  // Binary search to find the largest index i such that points[i].time <= time
  let left = 0;
  let right = points.length - 1;
  let idx = -1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (points[mid].time <= time) {
      idx = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  // Should not happen given outer boundary checks, but safe fallback
  if (idx === -1) return points[0];
  if (idx === points.length - 1) return points[idx];

  const p1 = points[idx];
  const p2 = points[idx + 1];

  // Prevent division by zero if two points have same time
  const timeDiff = p2.time - p1.time;
  if (timeDiff === 0) {
      return p1;
  }

  const ratio = (time - p1.time) / timeDiff;

  const lat = p1.lat + (p2.lat - p1.lat) * ratio;
  const lon = p1.lon + (p2.lon - p1.lon) * ratio;
  const ele = (p1.ele ?? 0) + ((p2.ele ?? 0) - (p1.ele ?? 0)) * ratio;
  const dist = (p1.dist ?? 0) + ((p2.dist ?? 0) - (p1.dist ?? 0)) * ratio;

  return { time, lat, lon, ele, dist };
};

// --- Track Simplification (Douglas-Peucker) ---

// Helper to get the perpendicular distance from a point to a line segment.
// Uses a simplified equirectangular projection, which is fine for small distances.
function getPerpendicularDistance(p: GpxPoint, start: GpxPoint, end: GpxPoint) {
    const x = p.lon;
    const y = p.lat;
    const x1 = start.lon;
    const y1 = start.lat;
    const x2 = end.lon;
    const y2 = end.lat;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    const param = len_sq !== 0 ? dot / len_sq : -1;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}


function douglasPeucker(points: GpxPoint[], epsilon: number): GpxPoint[] {
    if (points.length < 3) {
        return points;
    }

    let dmax = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
        const d = getPerpendicularDistance(points[i], points[0], points[end]);
        if (d > dmax) {
            index = i;
            dmax = d;
        }
    }

    if (dmax > epsilon) {
        const recResults1 = douglasPeucker(points.slice(0, index + 1), epsilon);
        const recResults2 = douglasPeucker(points.slice(index), epsilon);

        return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
    } else {
        return [points[0], points[end]];
    }
}

/**
 * Simplifies a track using the Douglas-Peucker algorithm.
 * @param points The array of GPX points to simplify.
 * @param tolerance A value in degrees. A good starting point is 0.0001 (~11 meters).
 */
export const simplifyTrack = (points: GpxPoint[], tolerance: number): GpxPoint[] => {
    if (tolerance <= 0 || points.length < 3) {
        return points;
    }
    return douglasPeucker(points, tolerance);
};
