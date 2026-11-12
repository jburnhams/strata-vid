// The made-up valley the test fixtures happen in. One elevation function feeds the GPX track's
// <ele> values, the map tiles' contour lines and woodland, and where each clip was "filmed", so
// the route on the map, the elevation profile and the footage agree with each other the way a
// real run's would. Deterministic: no Math.random anywhere, so regenerating gives the same files.

/** A seeded PRNG (mulberry32), for the few places that need a sequence rather than a field. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y, seed) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t) => t * t * (3 - 2 * t);

/** Value noise in [0, 1], continuous in x and y. */
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = smooth(xf), v = smooth(yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal noise in roughly [0, 1]. */
export function fbm(x, y, octaves = 4, seed = 0) {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * f, y * f, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

// The valley sits in the Peak District's latitude so speeds and distances read like a British fell
// run; the map is drawn from the function below, not from real data.
export const ORIGIN = { lat: 53.3655, lon: -1.8165 };
const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LON = 111_320 * Math.cos((ORIGIN.lat * Math.PI) / 180);

/** Metres east and north of the origin. */
export function toMetres(lat, lon) {
  return { x: (lon - ORIGIN.lon) * M_PER_DEG_LON, y: (lat - ORIGIN.lat) * M_PER_DEG_LAT };
}
export function toLatLon(x, y) {
  return { lat: ORIGIN.lat + y / M_PER_DEG_LAT, lon: ORIGIN.lon + x / M_PER_DEG_LON };
}

/**
 * Ground height in metres at a point given in metres from the origin: a valley floor near 200 m
 * running south-west to north-east, a ridge to the north-west rising past 450 m, and rolling
 * ground on top.
 */
export function elevationAt(x, y) {
  // Distance across the valley (positive = north-west side).
  const across = (-x * 0.6 + y * 0.8);
  const along = (x * 0.8 + y * 0.6);
  const valley = 195 + 0.0009 * along;
  const ridge = 270 / (1 + Math.exp(-(across - 1300) / 380));
  const spur = 70 * Math.exp(-(((along - 600) / 900) ** 2 + ((across - 700) / 500) ** 2));
  const southSide = across < 0 ? 0.00006 * across * across * 0.6 : 0;
  const rolling = 38 * (fbm(x / 700, y / 700, 5, 3) - 0.5);
  return valley + ridge + spur + Math.min(southSide, 160) + rolling;
}

/** Woodland in [0, 1]: thicker on the lower slopes, none on the open ridge top. */
export function woodlandAt(x, y) {
  const e = elevationAt(x, y);
  const n = fbm(x / 260, y / 260, 4, 11);
  const band = Math.exp(-(((e - 280) / 70) ** 2));
  return Math.max(0, Math.min(1, (n - 0.42) * 4 * band + (e < 230 ? (n - 0.62) * 3 : 0)));
}

/** The reservoir at the bottom of the valley, as a signed distance in metres (negative = water). */
export function reservoirAt(x, y) {
  const dx = (x + 900) / 520, dy = (y - -650) / 230;
  const wobble = 60 * (fbm(x / 300, y / 300, 3, 29) - 0.5);
  return (Math.sqrt(dx * dx + dy * dy) - 1) * 260 + wobble;
}
