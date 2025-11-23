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

  if (time <= points[0].time) {
    return { lat: points[0].lat, lon: points[0].lon };
  }

  if (time >= points[points.length - 1].time) {
    return { lat: points[points.length - 1].lat, lon: points[points.length - 1].lon };
  }

  // Binary search for the interval
  let low = 0;
  let high = points.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid].time === time) {
      return { lat: points[mid].lat, lon: points[mid].lon };
    } else if (points[mid].time < time) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // After binary search, 'high' should be the index of the point immediately before 'time'
  // and 'low' should be the index of the point immediately after 'time'.
  // However, due to loop termination condition (low <= high), we need to be careful.
  // Let's look at the state when loop terminates.
  // If we narrow down to [p1, p2] where p1.time < time < p2.time.
  // mid will pick p1 (if floor) or p2.
  // if mid=p1: time > p1.time -> low = mid + 1 = index of p2. high is still index of p2?? No.

  // Let's use a simpler binary search that finds the insertion index.
  // Or just Array.prototype.findIndex (linear) is too slow for large arrays? GPX can be large.
  // Binary search is safer.

  // Re-implementing binary search to find the largest index i such that points[i].time <= time
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

  if (idx === -1) return { lat: points[0].lat, lon: points[0].lon }; // Should be covered by early return
  if (idx === points.length - 1) return { lat: points[idx].lat, lon: points[idx].lon };

  const p1 = points[idx];
  const p2 = points[idx + 1];

  const ratio = (time - p1.time) / (p2.time - p1.time);

  return {
    lat: p1.lat + (p2.lat - p1.lat) * ratio,
    lon: p1.lon + (p2.lon - p1.lon) * ratio
  };
};
