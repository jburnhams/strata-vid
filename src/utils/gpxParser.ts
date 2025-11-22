import { parseGPX } from '@we-gold/gpxjs';
import { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { GpxStats } from '../types';

export const parseGpxFile = async (file: File): Promise<{ geoJson: FeatureCollection<Geometry, GeoJsonProperties>; stats: GpxStats | undefined }> => {
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
    stats
  };
};
