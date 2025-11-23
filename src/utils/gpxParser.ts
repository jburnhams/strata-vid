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
 * Finds the coordinate at a specific timestamp using linear interpolation.
 * Assumes points are sorted by time.
 */
export const getCoordinateAtTime = (points: GpxPoint[], time: number): { lat: number; lon: number } | null => {
  if (!points || points.length === 0) {
    return null;
  }

  // Edge cases: time outside range
  if (time <= points[0].time) {
    return { lat: points[0].lat, lon: points[0].lon };
  }

  if (time >= points[points.length - 1].time) {
    return { lat: points[points.length - 1].lat, lon: points[points.length - 1].lon };
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
  if (idx === -1) return { lat: points[0].lat, lon: points[0].lon };
  if (idx === points.length - 1) return { lat: points[idx].lat, lon: points[idx].lon };

  const p1 = points[idx];
  const p2 = points[idx + 1];

  // Prevent division by zero if two points have same time
  const timeDiff = p2.time - p1.time;
  if (timeDiff === 0) {
      return { lat: p1.lat, lon: p1.lon };
  }

  const ratio = (time - p1.time) / timeDiff;

  return {
    lat: p1.lat + (p2.lat - p1.lat) * ratio,
    lon: p1.lon + (p2.lon - p1.lon) * ratio
  };
};
