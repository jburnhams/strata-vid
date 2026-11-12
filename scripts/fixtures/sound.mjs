// The sound a chest camera records on a run, and a short music bed. Footfalls land on the same
// beat as the picture's bob (scene.mjs strikes at whole stride phases), breathing every two steps,
// wind that buffets the microphone, birds in the woods. Mono sources panned slightly into stereo.
import { fbm, rng } from './terrain.mjs';
import { SCENES } from './scene.mjs';

export const RATE = 48_000;

function onePole(cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / RATE);
  let y = 0;
  return (x) => (y = (1 - a) * x + a * y);
}

/** Interleaved stereo float samples for a clip of `scene` lasting `seconds`. */
export function clipAudio(name, seconds, seed) {
  const scene = SCENES[name];
  const n = Math.round(seconds * RATE);
  const out = new Float32Array(n * 2);
  const r = rng(seed);
  const white = () => r() * 2 - 1;
  const windLp = onePole(name === 'ridge' ? 380 : 160), windLp2 = onePole(40);
  const breathLo = onePole(500), breathHi = onePole(2200);
  const stepLp = onePole(name === 'lane' ? 1800 : 3800);
  const birds = [];
  if (name !== 'ridge') {
    for (let t = 0.3; t < seconds; t += 0.25 + r() * (name === 'woods' ? 0.9 : 2.5)) {
      const base = 3200 + r() * 2600;
      const notes = 2 + Math.floor(r() * 5);
      for (let k = 0; k < notes; k++) birds.push({ t: t + k * (0.07 + r() * 0.05), f0: base * (1 + 0.15 * r()), f1: base * (0.8 + 0.5 * r()), dur: 0.04 + r() * 0.06, amp: (name === 'woods' ? 0.06 : 0.025) * (0.4 + r()), pan: r() * 2 - 1 });
      t += notes * 0.1;
    }
  }
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const phase = t * scene.cadence;
    const sinceStrike = (phase % 1) / scene.cadence;
    const stepNoise = stepLp(white());
    // A footfall: a soft thump and the surface's crunch, louder on the stride's stronger foot.
    const foot = Math.floor(phase) % 2 === 0 ? 1 : 0.8;
    const thump = Math.sin(2 * Math.PI * 68 * sinceStrike) * Math.exp(-sinceStrike * 38) * 0.35 * foot;
    const crunch = stepNoise * Math.exp(-sinceStrike * (name === 'lane' ? 55 : 28)) * (name === 'lane' ? 0.22 : 0.4) * foot;
    // Breathing: in for one stride, out for the next, a band of noise.
    const bPhase = (t * scene.cadence) / 2 % 1;
    const bEnv = Math.pow(Math.sin(Math.PI * bPhase), 2) * (bPhase < 0.5 ? 0.6 : 1);
    const bNoise = breathHi(white()) - breathLo(white()) * 0.6;
    const breath = bNoise * bEnv * (name === 'woods' ? 0.2 : 0.13);
    // Wind on the microphone: low rumble with gusts.
    const gust = fbm(t * 0.9, seed, 3, 211);
    const wind = (windLp(white()) * 0.5 + windLp2(white()) * 3) * (name === 'ridge' ? 0.5 + gust : 0.15 + gust * 0.25);
    let l = thump + crunch + breath + wind;
    let rr = thump + crunch * 0.9 + breath * 1.1 + wind * 0.9;
    for (const b of birds) {
      const bt = t - b.t;
      if (bt < 0 || bt > b.dur) continue;
      const env = Math.sin((Math.PI * bt) / b.dur);
      const f = b.f0 + (b.f1 - b.f0) * (bt / b.dur);
      const s = Math.sin(2 * Math.PI * f * bt + 3 * Math.sin(2 * Math.PI * 40 * bt)) * env * b.amp;
      l += s * (1 - b.pan) * 0.5;
      rr += s * (1 + b.pan) * 0.5;
    }
    // A camera's limiter, gently.
    out[i * 2] = Math.tanh(l * 1.4) * 0.7;
    out[i * 2 + 1] = Math.tanh(rr * 1.4) * 0.7;
  }
  return out;
}

const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);

/**
 * A 20 s music bed at 120 bpm: A minor, F, C, G; a soft pad, a bass on the eighths, kick and hats.
 * The kind of track a runner lays under their footage.
 */
export function musicBed(seconds = 20, seed = 5) {
  const n = Math.round(seconds * RATE);
  const out = new Float32Array(n * 2);
  const r = rng(seed);
  const beat = 0.5; // seconds
  const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const padLp = onePole(1400), padLpR = onePole(1400), hatHp = onePole(7000);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const bar = Math.floor(t / (beat * 4));
    const chord = chords[bar % 4];
    const tb = t % beat;
    let pad = 0, padR = 0;
    for (const m of chord) {
      const f = NOTE(m + 12);
      for (const [det, side] of [[0.997, 0], [1.003, 1]]) {
        // A soft saw from three harmonics.
        const ph = 2 * Math.PI * f * det * t;
        const v = (Math.sin(ph) + Math.sin(2 * ph) / 2 + Math.sin(3 * ph) / 3) * 0.05;
        if (side) padR += v; else pad += v;
      }
    }
    const barT = t % (beat * 4);
    const swell = 0.6 + 0.4 * Math.min(1, barT / 0.3) * (1 - 0.3 * (barT / (beat * 4)));
    pad = padLp(pad) * swell; padR = padLpR(padR) * swell;
    const eighth = t % (beat / 2);
    const bassNote = NOTE(chord[0] - 12 + (Math.floor(t / (beat / 2)) % 4 === 3 ? 7 : 0));
    const bass = Math.sin(2 * Math.PI * bassNote * eighth) * Math.exp(-eighth * 5) * 0.32;
    const kf = 45 + 80 * Math.exp(-tb * 30);
    const kick = Math.sin(2 * Math.PI * kf * tb) * Math.exp(-tb * 9) * (t > 4 ? 0.55 : 0);
    const off = (t + beat / 2) % beat;
    const hn = r() * 2 - 1;
    const hat = (hn - hatHp(hn)) * Math.exp(-off * 60) * (t > 8 ? 0.12 : 0);
    const fade = Math.min(1, t / 1.5, (seconds - t) / 2.5);
    out[i * 2] = Math.tanh((pad + bass + kick + hat * 0.8) * 1.2) * 0.75 * fade;
    out[i * 2 + 1] = Math.tanh((padR + bass + kick + hat * 1.2) * 1.2) * 0.75 * fade;
  }
  return out;
}
