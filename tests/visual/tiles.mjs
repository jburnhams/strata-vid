// Map tiles for the visual tests, drawn from the fixtures' valley (scripts/fixtures/terrain.mjs)
// instead of fetched from OpenStreetMap: a screenshot must not depend on a tile server, and these
// agree with the GPX track (its <ele> values come from the same function), so the route climbs
// across the contour lines and through the woods it was "run" through. Three looks, for the
// map styles the app offers: a paper topo map, a dark one, and an aerial one.
import { deflateSync } from 'node:zlib';
import { elevationAt, fbm, reservoirAt, toMetres, woodlandAt } from '../../scripts/fixtures/terrain.mjs';

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** Encodes RGB pixels as a PNG. */
export function encodePng(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const STYLES = {
  topo: { land: [247, 244, 234], wood: [206, 226, 186], water: [181, 208, 230], waterEdge: [120, 160, 200], contour: [194, 120, 70], index: [170, 92, 44], road: [252, 214, 120], casing: [150, 120, 70] },
  dark: { land: [38, 38, 42], wood: [36, 48, 38], water: [28, 40, 58], waterEdge: [50, 70, 96], contour: [92, 70, 58], index: [120, 88, 66], road: [90, 86, 76], casing: [30, 30, 32] },
};

/** The valley road: along the valley floor, south of the village. */
function roadDistance(x, y) {
  const across = -x * 0.6 + y * 0.8 + 70 + 25 * Math.sin((x * 0.8 + y * 0.6) / 400);
  return Math.abs(across);
}

const tileToLonLat = (z, x, y) => {
  const n = 2 ** z;
  const lon = (x / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return { lat, lon };
};

/** Draws tile z/x/y in a style (`topo`, `dark` or `aerial`). Returns PNG bytes. */
export function renderTile(z, tx, ty, style = 'topo') {
  const S = 256;
  const ele = new Float32Array((S + 1) * (S + 1));
  const pos = [];
  for (let j = 0; j <= S; j++) {
    for (let i = 0; i <= S; i++) {
      const { lat, lon } = tileToLonLat(z, tx + i / S, ty + j / S);
      const m = toMetres(lat, lon);
      ele[j * (S + 1) + i] = elevationAt(m.x, m.y);
      if (i < S && j < S) pos.push(m);
    }
  }
  const metresPerPx = (156543.03 * Math.cos((53.36 * Math.PI) / 180)) / 2 ** z;
  const rgb = Buffer.alloc(S * S * 3);
  const p = STYLES[style] ?? STYLES.topo;
  for (let j = 0; j < S; j++) {
    for (let i = 0; i < S; i++) {
      const { x, y } = pos[j * S + i];
      const e = ele[j * (S + 1) + i];
      const k = (j * S + i) * 3;
      const water = reservoirAt(x, y);
      const wood = woodlandAt(x, y);
      const road = roadDistance(x, y);
      let c;
      if (style === 'aerial') {
        // Fields, moor and woods as seen from above, lit from the north-west by the slope.
        const ex = ele[j * (S + 1) + i + 1] - e, ey = ele[(j + 1) * (S + 1) + i] - e;
        const shade = 1 - Math.max(-0.25, Math.min(0.25, (ex + ey) / metresPerPx * 0.6));
        const n = fbm(x / 40, y / 40, 4, 301);
        const field = fbm(Math.floor(x / 120), Math.floor(y / 160), 1, 303);
        c = e > 330 ? [118 + 30 * n, 104 + 22 * n, 78 + 18 * n] : [96 + 40 * field + 20 * n, 122 + 30 * field + 18 * n, 62 + 14 * n];
        if (wood > 0.3) c = [46 + 30 * n, 70 + 32 * n, 38 + 14 * n];
        if (water < 0) c = [44, 66, 74];
        if (road < 4 / Math.max(1, metresPerPx / 2)) c = [150, 146, 136];
        c = c.map((v) => v * shade);
      } else {
        c = p.land.slice();
        if (wood > 0.3) {
          c = p.wood.slice();
          // The tree symbols of a paper map, as a sparse dot pattern.
          if (z >= 14 && (i + j * 3) % 11 === 0 && (j % 7 === 0)) c = c.map((v) => v * 0.8);
        }
        // Contour lines every 10 m, every 50 m bolder.
        const a = ele[j * (S + 1) + i], b = ele[j * (S + 1) + i + 1], d = ele[(j + 1) * (S + 1) + i];
        const step = z >= 13 ? 10 : 50;
        const crosses = Math.floor(a / step) !== Math.floor(b / step) || Math.floor(a / step) !== Math.floor(d / step);
        if (crosses) {
          const level = Math.floor(Math.max(a, b, d) / step) * step;
          c = level % 50 === 0 ? p.index : p.contour.map((v, n) => (v + c[n]) / 2);
        }
        const roadHalf = Math.max(2.4, 5 / metresPerPx + 1.2);
        if (road < roadHalf) c = road < roadHalf - 1 ? p.road : p.casing;
        if (water < 0) c = water > -metresPerPx * 1.2 ? p.waterEdge : p.water;
      }
      rgb[k] = c[0]; rgb[k + 1] = c[1]; rgb[k + 2] = c[2];
    }
  }
  return encodePng(S, S, rgb);
}

/** Which look a tile URL from the app asks for, and its z/x/y. */
export function parseTileUrl(url) {
  const u = new URL(url);
  const parts = u.pathname.split('/').filter(Boolean);
  if (u.hostname.includes('arcgisonline')) {
    const [z, y, x] = parts.slice(-3).map(Number);
    return { z, x, y, style: 'aerial' };
  }
  const [z, x, yPart] = parts.slice(-3);
  return { z: Number(z), x: Number(x), y: parseInt(yPart, 10), style: u.hostname.includes('cartocdn') ? 'dark' : 'topo' };
}

/** The hosts the app's map styles load tiles from. */
export const TILE_HOSTS = /^https:\/\/([a-z]\.tile\.openstreetmap\.org|[a-z]\.basemaps\.cartocdn\.com|server\.arcgisonline\.com)\//;

const cache = new Map();
/** A tile's PNG for a URL, drawn once per run. */
export function tileFor(url) {
  if (!cache.has(url)) {
    const { z, x, y, style } = parseTileUrl(url);
    cache.set(url, renderTile(z, x, y, style));
  }
  return cache.get(url);
}
