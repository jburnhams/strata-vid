// Draws chest-camera running footage, one frame at a time, as raw RGB. Not a game engine: a
// ground plane in perspective, a sky with drifting cloud, two ranges of hills, and sprites (trees,
// dry-stone wall, posts) placed in the world and sorted by depth. What makes it read as footage
// rather than a test card is the camera: a vertical bob at the runner's cadence, a sway at half
// of it, a little exposure breathing, sensor grain, a vignette and a short motion smear.
import { fbm, noise2, rng } from './terrain.mjs';

const clamp = (v, lo = 0, hi = 255) => (v < lo ? lo : v > hi ? hi : v);
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/** The three places the clips are filmed. */
export const SCENES = {
  // The valley lane: tarmac with a worn centre, dry-stone walls, fields and the ridge ahead.
  lane: {
    speed: 3.2, cadence: 2.92, bob: 0.032, sway: 0.035, horizon: 0.44, camHeight: 1.35,
    sky: { top: [96, 140, 196], horizon: [214, 222, 226], cloud: 0.55, cloudColour: [244, 242, 238] },
    farHills: { colour: [128, 146, 162], height: 0.11, scale: 1.4 },
    nearHills: { colour: [82, 110, 64], height: 0.06, scale: 3.1 },
    ground: { base: [92, 126, 58], var: [48, 40, 20], scale: 2.4 },
    path: { kind: 'road', halfWidth: 1.55, colour: [92, 90, 90], edge: [74, 104, 48], curve: 9, wavelength: 140 },
    walls: true, trees: { spacing: 22, offset: [5.5, 30], height: [7, 13], canopy: [52, 80, 38], density: 0.55 },
    grade: [1.0, 1.0, 1.03], light: 1.0,
  },
  // The climb through the woods: a narrow earth path, roots and stones, close trunks, dappled light.
  woods: {
    speed: 1.75, cadence: 2.55, bob: 0.028, sway: 0.05, horizon: 0.40, camHeight: 1.3,
    sky: { top: [170, 190, 196], horizon: [92, 104, 80], cloud: 0.2, cloudColour: [230, 232, 226] },
    farHills: { colour: [70, 92, 66], height: 0.05, scale: 2.0 },
    nearHills: { colour: [52, 72, 40], height: 0.03, scale: 4.0 },
    ground: { base: [66, 62, 38], var: [34, 32, 18], scale: 4.5 },
    path: { kind: 'trail', halfWidth: 0.55, colour: [112, 88, 62], edge: [62, 70, 36], curve: 4, wavelength: 38 },
    walls: false, trees: { spacing: 2.6, offset: [1.6, 14], height: [11, 19], canopy: [44, 74, 30], density: 1 },
    canopyRoof: true, dapple: true, climb: 0.08,
    grade: [0.97, 1.0, 0.94], light: 0.92,
  },
  // The ridge top: open moor, a stony path, the valley and reservoir far below, wind.
  ridge: {
    speed: 2.4, cadence: 2.8, bob: 0.03, sway: 0.04, horizon: 0.50, camHeight: 1.35,
    sky: { top: [70, 116, 182], horizon: [206, 216, 228], cloud: 0.62, cloudColour: [250, 250, 248] },
    farHills: { colour: [118, 136, 160], height: 0.13, scale: 1.3 },
    nearHills: { colour: [104, 98, 74], height: 0.03, scale: 2.4 },
    ground: { base: [112, 98, 70], var: [40, 38, 26], scale: 3.2 },
    path: { kind: 'stony', halfWidth: 0.8, colour: [150, 138, 118], edge: [104, 98, 64], curve: 6, wavelength: 70 },
    walls: false, trees: { spacing: 60, offset: [12, 40], height: [3, 5], canopy: [80, 92, 50], density: 0.25 },
    posts: true, moor: true,
    grade: [1.02, 1.0, 1.04], light: 1.05,
  },
};

function pathCentre(scene, z) {
  const p = scene.path;
  return p.curve * Math.sin(z / p.wavelength) + p.curve * 0.4 * Math.sin(z / (p.wavelength * 0.37) + 1.3);
}

function buildSprites(scene, length, seed) {
  const r = rng(seed);
  const sprites = [];
  const t = scene.trees;
  for (let z = 4; z < length; z += t.spacing * (0.6 + r() * 0.8)) {
    for (const side of [-1, 1]) {
      if (r() > t.density) continue;
      const off = t.offset[0] + r() * (t.offset[1] - t.offset[0]);
      sprites.push({ kind: 'tree', z: z + r() * t.spacing, side, off, h: t.height[0] + r() * (t.height[1] - t.height[0]), w: 0.5 + r() * 0.35, seed: Math.floor(r() * 1e6) });
    }
  }
  if (scene.walls) {
    for (let z = 0; z < length; z += 0.9) {
      for (const side of [-1, 1]) sprites.push({ kind: 'wall', z, len: 0.9, side, off: scene.path.halfWidth + 1.0, h: 1.15 + 0.1 * noise2(z / 3, side, 3), seed: Math.floor(z * 10) + side });
    }
  }
  if (scene.posts) {
    for (let z = 10; z < length; z += 9) sprites.push({ kind: 'post', z, side: 1, off: scene.path.halfWidth + 2.6, h: 1.2, seed: z });
  }
  if (scene.path.kind !== 'road') {
    for (let z = 2; z < length; z += 1.5 + r() * 3) sprites.push({ kind: 'stone', z, side: r() < 0.5 ? -1 : 1, off: r() * scene.path.halfWidth * 1.6, h: 0.06 + r() * 0.1, seed: Math.floor(r() * 1e6) });
  }
  return sprites;
}

/**
 * Renders a clip's frames. Calls `onFrame(rgb, index)` with a fresh Buffer per frame.
 * `start` offsets the walk so two clips of one scene differ.
 */
export function renderScene(name, { width, height, fps, seconds, seed = 1, start = 0, onFrame }) {
  const scene = SCENES[name];
  const frames = Math.round(fps * seconds);
  const f = width * 0.62; // focal length in px: a wide chest camera
  const sprites = buildSprites(scene, start + scene.speed * seconds + 160, seed);
  const buf = new Float32Array(width * height * 3);
  const prev = new Float32Array(width * height * 3);
  const depth = new Float32Array(width * height);
  const out = Buffer.alloc(width * height * 3);

  for (let fi = 0; fi < frames; fi++) {
    const time = fi / fps;
    const pos = start + scene.speed * time;
    const phase = time * scene.cadence;
    // Foot strike at whole phases: the camera is lowest and jolts; sway follows the stride.
    const bob = -scene.bob * Math.cos(2 * Math.PI * phase) - 0.012 * Math.exp(-((phase % 1) * 9));
    const sway = scene.sway * Math.sin(Math.PI * phase);
    const camH = scene.camHeight + bob;
    const camX = pathCentre(scene, pos) + sway;
    // Pitch nods with the stride, yaw follows the path ahead (the runner looks where it goes).
    const pitchPx = height * (0.006 * Math.sin(2 * Math.PI * phase + 0.6));
    const yawPx = (pathCentre(scene, pos + 14) - pathCentre(scene, pos)) / 14 * f * 0.8 + sway * 40;
    const horizon = height * scene.horizon + pitchPx - (scene.climb ? scene.climb * f : 0);
    const exposure = scene.light * (1 + 0.025 * (fbm(time * 0.7, seed, 2, 31) - 0.5));
    const cx = width / 2 - yawPx;

    // Sky, hills and ground, per pixel.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 3;
        let c;
        let d = 1e9;
        const dy = y - horizon;
        const worldYaw = (x - cx) / f; // radians, roughly
        const farH = height * scene.farHills.height * Math.max(0.08, 0.15 + 2.2 * (fbm(worldYaw * scene.farHills.scale + 7, 0.3, 4, 51) - 0.32));
        const nearH = height * scene.nearHills.height * Math.max(0.05, 0.1 + 2 * (fbm(worldYaw * scene.nearHills.scale + 3, 0.9, 4, 53) - 0.35));
        if (dy > 0.5) {
          const z = (f * camH) / dy;
          const wz = pos + z;
          const wx = camX + ((x - cx) * z) / f;
          const g = scene.ground;
          const n = fbm(wx * g.scale * 0.25, wz * g.scale * 0.25, 4, 61);
          const coarse = fbm(wx * 0.05, wz * 0.05, 2, 67);
          c = [g.base[0] + g.var[0] * (n - 0.5) * 2 + 18 * (coarse - 0.5), g.base[1] + g.var[1] * (n - 0.5) * 2 + 14 * (coarse - 0.5), g.base[2] + g.var[2] * (n - 0.5) * 2];
          // Mown strip or field striping on the lane's fields.
          if (scene.path.kind === 'road' && Math.abs(wx - pathCentre(scene, wz)) > 3.5) {
            // Fields of different ages behind the walls, with tractor lines in some.
            const cell = noise2(Math.floor(wx / 45) + 0.5, Math.floor(wz / 70) + 0.5, 131);
            const tint = (cell - 0.5) * 34;
            const lines = cell > 0.55 && Math.sin(wx * 1.4) > 0.75 ? 8 : 0;
            c = [c[0] + tint * 0.6 + lines * 0.4, c[1] + tint + lines, c[2] + tint * 0.2];
          }
          if (scene.moor) {
            // Heather, bilberry and pale grass in patches; tussocks catch the light.
            const h = fbm(wx * 0.6, wz * 0.6, 3, 137);
            const tus = fbm(wx * 3, wz * 3, 2, 139);
            const hh = fbm(wx * 1.8, wz * 1.8, 3, 193);
            c = h > 0.56 ? mix3(c, [96, 70, 74], clamp((h - 0.56) * 6, 0, 0.6)) : h < 0.42 ? mix3(c, [136, 128, 82], clamp((0.42 - h) * 6, 0, 0.7)) : c;
            c = c.map((v) => v * (0.88 + 0.24 * hh));
            if (tus > 0.62) c = c.map((v) => v + 16);
          }
          if (scene.dapple) {
            // Bracken and moss on the woodland floor.
            const b = fbm(wx * 0.35, wz * 0.35, 3, 141);
            if (b > 0.55) c = mix3(c, [70, 92, 36], clamp((b - 0.55) * 6, 0, 0.8));
          }
          const off = wx - pathCentre(scene, wz);
          const p = scene.path;
          const edgeSoft = Math.max(0.04, z * 0.003);
          const inPath = 1 - clamp((Math.abs(off) - p.halfWidth) / edgeSoft + 0.5, 0, 1);
          if (inPath > 0) {
            const pn = fbm(wx * 6, wz * 6, 3, 71);
            let pc;
            if (p.kind === 'road') {
              const wear = Math.exp(-((Math.abs(off) - 0.9) ** 2) / 0.12);
              pc = [p.colour[0] + 22 * (pn - 0.5) - wear * 6, p.colour[1] + 22 * (pn - 0.5) - wear * 6, p.colour[2] + 20 * (pn - 0.5) - wear * 4];
              // A patched repair and a white edge line in places.
              if (fbm(wx * 0.4, wz * 0.08, 2, 73) > 0.66) pc = pc.map((v) => v - 12);
              // Grass growing up the crown of the lane and gravel at its edges.
              if (Math.abs(off) < 0.12 && fbm(wx * 6, wz * 3, 2, 79) > 0.58) pc = mix3(pc, [84, 100, 56], 0.35);
              if (Math.abs(off) > p.halfWidth - 0.25) pc = mix3(pc, [118, 112, 100], 0.5);
            } else {
              const stony = p.kind === 'stony' ? (pn > 0.6 ? 18 * clamp((pn - 0.6) * 10, 0, 1) : -6) : 0;
              const rut = Math.exp(-(off * off) / 0.05) * 10;
              pc = [p.colour[0] + 40 * (pn - 0.5) + stony - rut, p.colour[1] + 34 * (pn - 0.5) + stony - rut, p.colour[2] + 28 * (pn - 0.5) + stony - rut];
            }
            c = mix3(c, pc, inPath);
          }
          if (scene.dapple) {
            const light = fbm(wx * 0.5 + time * 0.08, wz * 0.5, 3, 79);
            const k = 0.78 + 0.6 * clamp((light - 0.5) * 5, 0, 1);
            c = [c[0] * k, c[1] * k, c[2] * k * 0.95];
          }
          // Aerial perspective: distant ground fades to the horizon colour.
          const haze = 1 - Math.exp(-z / (scene.moor ? 320 : 180));
          c = mix3(c, scene.sky.horizon, haze * 0.75);
          d = z;
        } else if (-dy < nearH) {
          const t = clamp(-dy / Math.max(1, nearH), 0, 1);
          const n = fbm(x * 0.05, y * 0.05, 3, 83);
          c = scene.nearHills.colour.map((v) => v * (0.9 + 0.2 * n) + 20 * t);
          c = mix3(c, scene.sky.horizon, 0.25);
          d = 5000;
        } else if (-dy < farH) {
          c = mix3(scene.farHills.colour, scene.sky.horizon, 0.35 + 0.2 * clamp(-dy / Math.max(1, farH), 0, 1));
          d = 9000;
        } else {
          const t = clamp(-dy / (height * 0.6), 0, 1);
          c = mix3(scene.sky.horizon, scene.sky.top, Math.pow(t, 0.7));
          // Clouds on a plane overhead, drifting with the wind.
          const zc = 900 / Math.max(0.02, -dy / f);
          const u = (worldYaw * zc) / 700 + time * 0.02, v = zc / 700 + pos / 4000;
          const cl = fbm(u, v, 5, 89);
          const cover = clamp((cl - (1 - scene.sky.cloud)) * 3.2, 0, 1);
          const shade = 0.82 + 0.18 * fbm(u * 2, v * 2, 2, 97);
          c = mix3(c, scene.sky.cloudColour.map((s) => s * shade), cover * 0.92);
        }
        buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
        depth[y * width + x] = d;
      }
    }

    // Canopy overhead in the woods: leaves against bright sky gaps.
    if (scene.canopyRoof) {
      for (let y = 0; y < height; y++) {
        const roofT = clamp(1 - (y - 0) / (horizon * 0.95), 0, 1);
        if (roofT <= 0) continue;
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 3;
          const u = (x - cx) / f, v = y / f;
          const n = fbm(u * 9 + pos * 0.03, v * 9, 4, 101);
          const leaf = clamp((n - (0.62 - roofT * 0.3)) * 7, 0, 1);
          const lc = [38 + 50 * n, 64 + 70 * n, 26 + 26 * n];
          buf[i] = mix(buf[i], lc[0], leaf); buf[i + 1] = mix(buf[i + 1], lc[1], leaf); buf[i + 2] = mix(buf[i + 2], lc[2], leaf);
        }
      }
    }

    // Sprites, far to near.
    const visible = sprites.filter((s) => s.z > pos + 0.8 && s.z < pos + 160).sort((a, b) => b.z - a.z);
    for (const s of visible) {
      const z = s.z - pos;
      const wx = pathCentre(scene, s.z) + s.side * s.off;
      const sx = cx + ((wx - camX) * f) / z;
      const baseY = horizon + (f * camH) / z;
      const hPx = (s.h * f) / z;
      const haze = 1 - Math.exp(-z / 180);
      if (s.kind === 'wall') {
        // A run of dry-stone wall from z to z + len, foreshortened along the lane.
        const z2 = z + s.len;
        const wx2 = pathCentre(scene, s.z + s.len) + s.side * s.off;
        const sxA = cx + ((wx - camX) * f) / z, sxB = cx + ((wx2 - camX) * f) / z2;
        const baseA = horizon + (f * camH) / z, baseB = horizon + (f * camH) / z2;
        const topA = baseA - (s.h * f) / z, topB = baseB - (s.h * f) / z2;
        const xa = Math.min(sxA, sxB), xb = Math.max(sxA, sxB);
        for (let x = Math.max(0, Math.floor(xa)); x < Math.min(width, Math.ceil(xb) + 1); x++) {
          const t = xb - xa < 0.5 ? 0 : (x - sxA) / (sxB - sxA);
          const tt = clamp(t, 0, 1);
          const base = mix(baseA, baseB, tt), top = mix(topA, topB, tt), zz = mix(z, z2, tt);
          // Copes along the top are uneven.
          const cope = (top - base) * 0.06 * (noise2((s.z + tt * s.len) * 4, s.side, 149) - 0.5);
          for (let y = Math.max(0, Math.floor(top + cope)); y < Math.min(height, Math.ceil(base)); y++) {
            const k = y * width + x;
            if (depth[k] < zz) continue;
            const ly = (base - y) / Math.max(1, base - top);
            const along = s.z + tt * s.len;
            // Gritstone blocks in rough courses: a cell pattern with dark mortarless joints.
            const course = Math.floor(ly * 6 + noise2(along, 0, 151) * 0.4);
            const block = Math.floor(along * 2.2 + course * 0.5 + 0.6 * noise2(along * 1.3, course, 191));
            const id = noise2(block + 0.5, course + 0.5, 157);
            const jointY = Math.abs(((ly * 6 + noise2(along, 0, 151) * 0.4) % 1) - 0.5) > 0.42;
            const jointX = Math.abs(((along * 2.2 + course * 0.5 + 0.6 * noise2(along * 1.3, course, 191)) % 1) - 0.5) > 0.46;
            const tex = fbm(along * 9, ly * 7, 2, 163);
            let v = 64 + 40 * id + 22 * tex;
            if (jointY || jointX) v *= 0.55;
            if (ly > 0.88) v *= 0.85;
            let c = [v * 1.02, v * 0.98, v * 0.88];
            const lichen = noise2(along * 3, ly * 3, 167);
            if (lichen > 0.72) c = [c[0] * 0.9, c[1] * 1.05, c[2] * 0.75];
            const hz = mix3(c, scene.sky.horizon, haze * 0.75);
            const i = k * 3;
            buf[i] = hz[0]; buf[i + 1] = hz[1]; buf[i + 2] = hz[2];
            depth[k] = zz;
          }
        }
      } else if (s.kind === 'tree') {
        const trunkW = Math.max(1, (s.w * f) / z * (scene.canopyRoof ? 0.65 : 0.5));
        const canopyW = (s.h * 0.45 * f) / z;
        const crownW = scene.canopyRoof ? (3.2 * f) / z : canopyW * 2.2;
        const x0 = Math.floor(sx - Math.max(trunkW, crownW)), x1 = Math.ceil(sx + Math.max(trunkW, crownW));
        const yTop = Math.floor(scene.canopyRoof ? 0 : baseY - hPx * 1.6);
        const crownBase = 5.5 + (s.seed % 37) / 12; // metres up the trunk where the woods' crowns start
        for (let y = Math.max(0, yTop); y < Math.min(height, Math.ceil(baseY)); y++) {
          for (let x = Math.max(0, x0); x < Math.min(width, x1); x++) {
            const k = y * width + x;
            if (depth[k] < z) continue;
            const ly = (baseY - y) / hPx; // 0 at the foot, 1 at the top
            const lx = (x - sx) / Math.max(1, canopyW);
            let c = null;
            // A canopy: one rounded mass with a lumpy outline (noise on the angle, so it stays one
            // piece), lit from the upper left and darker underneath.
            const cy = (ly - 0.7) / 0.36;
            const ang = Math.atan2(cy, lx);
            const rim = 1 + 0.32 * (fbm(Math.cos(ang) * 1.6 + s.seed % 101, Math.sin(ang) * 1.6, 3, 181) - 0.5) * 2;
            const inCanopy = !scene.canopyRoof && lx * lx + cy * cy < rim * rim;
            const metresUp = ((baseY - y) * z) / f;
            if (scene.canopyRoof && metresUp > crownBase) {
              // Woodland crowns: a ragged mass of leaves with sky showing through in places.
              const mx = ((x - sx) * z) / f;
              const n = fbm(mx * 0.9 + s.seed * 0.01, metresUp * 0.9, 3, 197);
              const edge = Math.abs(mx) / 3.2 + (crownBase + 1 - metresUp) * 0.4;
              if (n - edge * 0.35 > 0.32) {
                const lit = 0.6 + 0.6 * fbm(mx * 2.5, metresUp * 2.5, 2, 199);
                c = scene.trees.canopy.map((v) => v * lit);
              }
            } else
            if (inCanopy) {
              const n = fbm(lx * 6 + s.seed, ly * 7, 3, 103);
              const lit = 0.55 + 0.75 * clamp(0.35 - lx * 0.35 + (ly - 0.55) * 1.2, 0, 1);
              c = scene.trees.canopy.map((v) => v * lit * (0.7 + 0.6 * n));
            } else if (Math.abs(x - sx) < (trunkW / 2) * (scene.canopyRoof ? 1 - Math.min(0.5, metresUp * 0.04) : 1 - ly * 0.5) && (scene.canopyRoof ? metresUp <= crownBase + 2 : ly < 0.62)) {
              const bark = fbm((x - sx) / Math.max(1, trunkW) * 3, ly * 30 + s.seed, 3, 107);
              const side = (x - sx) / Math.max(1, trunkW);
              const lit = 0.7 + 0.5 * clamp(0.5 - side, 0, 1);
              c = [(58 + 34 * bark) * lit, (50 + 28 * bark) * lit, (40 + 20 * bark) * lit];
              if (scene.canopyRoof) {
                const moss = fbm(side * 2, ly * 8 + s.seed, 2, 109);
                if (moss > 0.66 && ly < 0.25) c = [c[0] * 0.9, c[1] * 1.08, c[2] * 0.8];
              }
            }
            if (c) {
              const i = k * 3;
              const hz = mix3(c, scene.sky.horizon, haze * 0.75);
              buf[i] = hz[0]; buf[i + 1] = hz[1]; buf[i + 2] = hz[2];
              depth[k] = z;
            }
          }
        }
      } else {
        // Wall, post or stone: a box with a stony texture, lit from the left.
        const w = s.kind === 'wall' ? (0.95 * f) / z : s.kind === 'post' ? (0.12 * f) / z : (s.h * 1.6 * f) / z;
        const x0 = Math.floor(sx - w / 2), x1 = Math.ceil(sx + w / 2);
        for (let y = Math.max(0, Math.floor(baseY - hPx)); y < Math.min(height, Math.ceil(baseY)); y++) {
          for (let x = Math.max(0, x0); x < Math.min(width, x1); x++) {
            const k = y * width + x;
            if (depth[k] < z) continue;
            const ly = (baseY - y) / hPx, lx = (x - sx) / Math.max(1, w);
            if (s.kind === 'stone' && lx * lx * 4 + ly * ly > 1) continue;
            let c;
            if (s.kind === 'post') c = [92, 74, 56];
            else {
              const n = noise2(lx * 5 + s.seed * 0.37, ly * 4, 113) * (s.kind === 'stone' ? 0.55 : 1) - (s.kind === 'stone' ? 0.25 + 0.4 * (1 - ly) : 0);
              const course = Math.abs(Math.sin(ly * Math.PI * 4)) < 0.15 ? 0.7 : 1;
              const top = s.kind === 'wall' && ly > 0.86 ? 0.85 : 1;
              const v = (110 + 70 * n) * course * top;
              c = [v * 1.02, v, v * 0.92];
              if (s.kind === 'wall' && noise2(lx * 3 + s.seed, ly * 2, 127) > 0.7) c = [c[0] * 0.8, c[1] * 0.95, c[2] * 0.7];
            }
            const i = k * 3;
            const hz = mix3(c, scene.sky.horizon, haze * 0.75);
            buf[i] = hz[0]; buf[i + 1] = hz[1]; buf[i + 2] = hz[2];
            depth[k] = z;
          }
        }
      }
    }

    // Camera: smear with the last frame, exposure, grade, vignette, grain.
    const smear = fi === 0 ? 0 : 0.22;
    const grainSeed = seed * 1000 + fi;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const k = y * width + x, i = k * 3;
        const ux = (x / width - 0.5) * 2, uy = (y / height - 0.5) * 2;
        const vig = 1 - 0.28 * Math.pow(ux * ux * 0.6 + uy * uy * 0.8, 1.4);
        const grain = (noise2(x * 0.9, y * 0.9, grainSeed) - 0.5) * 7;
        for (let ch = 0; ch < 3; ch++) {
          let v = buf[i + ch] * exposure * scene.grade[ch] * vig;
          v = 255 * Math.pow(clamp(v / 255, 0, 1), 0.96); // a touch of lift, as a camera's tone curve
          v = smear ? mix(v, prev[i + ch], smear) : v;
          prev[i + ch] = v;
          out[i + ch] = clamp(Math.round(v + grain));
        }
      }
    }
    onFrame(Buffer.from(out), fi);
  }
  return frames;
}
