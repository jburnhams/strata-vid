import { parseGPX } from '@we-gold/gpxjs';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <trkseg>
      <trkpt lat="40.7128" lon="-74.0060">
        <time>2023-10-27T10:00:00Z</time>
      </trkpt>
      <trkpt lat="40.7138" lon="-74.0050">
        <time>2023-10-27T10:05:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

const [parsed, error] = parseGPX(xml);
if (error) console.error(error);
else console.log('Duration:', parsed.tracks[0].duration.totalDuration);
