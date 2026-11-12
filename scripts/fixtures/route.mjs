// The run the fixtures record: a 6 km loop out of the village along the valley lane, up through
// the woods onto the ridge, along the top and back down. Points are spaced in time the way a
// watch records them (every 2 s), with GPS wander, a heart rate and a cadence that follow the
// gradient, so the elevation profile, the pace and the map look like a real activity.
import { elevationAt, fbm, toLatLon, woodlandAt } from './terrain.mjs';

// Waypoints as (along the valley, across the valley) in metres.
const WAYPOINTS = [
  [0, 0], [380, 40], [760, 90], [1100, 160], [1330, 420], [1500, 900], [1430, 1250], [1380, 1520],
  [1000, 1800], [520, 1930], [120, 1900], [-380, 1720], [-560, 1300], [-480, 880], [-260, 420], [-90, 120], [0, 0],
];

const fromAlongAcross = (along, across) => ({ x: 0.8 * along - 0.6 * across, y: 0.6 * along + 0.8 * across });

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

/** The path as dense points every ~1 m, in metres east/north of the origin. */
function densePath() {
  const pts = [];
  const n = WAYPOINTS.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = WAYPOINTS[Math.max(0, i - 1)], p1 = WAYPOINTS[i], p2 = WAYPOINTS[i + 1], p3 = WAYPOINTS[Math.min(n - 1, i + 2)];
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.ceil(segLen);
    for (let s = 0; s < steps; s++) {
      const [along, across] = catmullRom(p0, p1, p2, p3, s / steps);
      // A path is never straight: small bends, stronger off the lane.
      const d = pts.length;
      const wig = (d < 1200 ? 3 : 9) * (fbm(d / 90, 0.5, 3, 41) - 0.5);
      const { x, y } = fromAlongAcross(along + wig * 0.3, across + wig);
      pts.push({ x, y });
    }
  }
  pts.push(fromAlongAcross(0, 0));
  let dist = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) dist += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    pts[i].dist = dist;
    pts[i].ele = elevationAt(pts[i].x, pts[i].y);
  }
  return pts;
}

export const START = new Date('2026-05-03T06:41:08Z');

/**
 * Runs the path: pace from the gradient (a fell runner walks the steep bits), sampled every 2 s.
 * Returns watch samples with time, position (with GPS wander), elevation, heart rate, cadence,
 * and the true (unwandered) position and surroundings for placing the clips.
 */
export function runRoute() {
  const path = densePath();
  const samples = [];
  let t = 0, i = 0, hr = 96;
  const stepSec = 2;
  while (i < path.length - 1) {
    const ahead = path[Math.min(path.length - 1, i + 20)];
    const grade = (ahead.ele - path[i].ele) / Math.max(1, ahead.dist - path[i].dist);
    let v = grade > 0 ? 3.35 / (1 + 11 * grade) : 3.35 * (1 + Math.min(0.2, -grade * 1.6));
    v *= 1 + 0.04 * (fbm(t / 40, 2.5, 2, 7) - 0.5);
    const walking = v < 1.7;
    const effort = Math.min(1, Math.max(0, 0.55 + grade * 3.2));
    const targetHr = 128 + effort * 46;
    hr += (targetHr - hr) * 0.06 + (fbm(t / 15, 9.1, 2, 5) - 0.5) * 1.2;
    const p = path[i];
    const wander = { x: 3.2 * (fbm(t / 50, 1.3, 3, 13) - 0.5), y: 3.2 * (fbm(t / 50, 7.7, 3, 17) - 0.5) };
    const { lat, lon } = toLatLon(p.x + wander.x, p.y + wander.y);
    samples.push({
      time: new Date(START.getTime() + t * 1000), t, lat, lon,
      ele: p.ele + 1.5 * (fbm(t / 30, 4.4, 2, 19) - 0.5),
      hr: Math.round(hr), cad: walking ? Math.round(56 + 4 * fbm(t / 9, 1, 2, 23)) : Math.round(86 + 3 * fbm(t / 9, 1, 2, 23)),
      x: p.x, y: p.y, dist: p.dist, grade, speed: v, woodland: woodlandAt(p.x, p.y),
    });
    // Advance along the dense path by v * stepSec metres.
    const target = p.dist + v * stepSec;
    while (i < path.length - 1 && path[i].dist < target) i++;
    t += stepSec;
  }
  return samples;
}

const iso = (d) => d.toISOString().replace('.000Z', 'Z');

/** The samples as a GPX 1.1 file in the shape a Garmin watch exports (TrackPointExtension hr, cad). */
export function toGpx(samples) {
  const pts = samples.map((s) => `      <trkpt lat="${s.lat.toFixed(7)}" lon="${s.lon.toFixed(7)}">
        <ele>${s.ele.toFixed(1)}</ele>
        <time>${iso(s.time)}</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>${s.hr}</gpxtpx:hr>
            <gpxtpx:cad>${s.cad}</gpxtpx:cad>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="Garmin Connect" version="1.1"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/11.xsd"
  xmlns:ns3="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata>
    <link href="connect.garmin.com">
      <text>Garmin Connect</text>
    </link>
    <time>${iso(samples[0].time)}</time>
  </metadata>
  <trk>
    <name>Ridge loop</name>
    <type>trail_running</type>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>
`;
}
