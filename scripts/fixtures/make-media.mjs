#!/usr/bin/env node
// Writes the media the visual tests import: a GPX activity, three chest-camera clips filmed along
// it, a photo from the top and a music bed. Run from the repository root:
//
//   node scripts/fixtures/make-media.mjs            (all files, about four minutes)
//   node scripts/fixtures/make-media.mjs gpx        (only some: gpx, lane, woods, ridge, photo, music)
//
// Needs ffmpeg with libx264, aac and libmp3lame on PATH; nothing from npm. The output is committed
// in tests/fixtures/media/, so the tests never run this. Everything is seeded, so a rerun writes
// the same pictures and sound (the encoders may still differ by a byte between ffmpeg versions).
//
// The clips are H.264 + AAC in MP4, named and timestamped the way a GoPro names and timestamps
// them, because that is what people bring to this app; Playwright's Chromium decodes them.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runRoute, toGpx } from './route.mjs';
import { renderScene } from './scene.mjs';
import { clipAudio, musicBed, RATE } from './sound.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(root, 'tests', 'fixtures', 'media');
mkdirSync(outDir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'strata-vid-media-'));
const only = new Set(process.argv.slice(2));
const want = (k) => only.size === 0 || only.has(k);

const samples = runRoute();
const at = (pred) => samples.find(pred);

// Where each clip was filmed: on the lane early on, climbing in the woods, and on the ridge top.
const CLIPS = [
  { key: 'lane', file: 'GX010412.MP4', seconds: 8, seed: 3, sample: at((s) => s.t >= 150) },
  { key: 'woods', file: 'GX010413.MP4', seconds: 8, seed: 7, sample: at((s) => s.t > 500 && s.woodland > 0.6 && s.grade > 0.05) },
  { key: 'ridge', file: 'GX010414.MP4', seconds: 6, seed: 11, sample: at((s) => s.t > 1500 && s.ele > 415) },
];
const W = 640, H = 360, FPS = 25;

function ffmpeg(args, input) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { input, maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
}

const pcm = (f32) => Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);

if (want('gpx')) {
  writeFileSync(join(outDir, 'ridge-loop.gpx'), toGpx(samples));
  console.log(`ridge-loop.gpx: ${samples.length} points, ${(samples.at(-1).dist / 1000).toFixed(2)} km`);
}

for (const clip of CLIPS) {
  if (!want(clip.key)) continue;
  const frames = [];
  renderScene(clip.key, { width: W, height: H, fps: FPS, seconds: clip.seconds, seed: clip.seed, onFrame: (b) => frames.push(b) });
  const wav = join(tmp, `${clip.key}.f32`);
  writeFileSync(wav, pcm(clipAudio(clip.key, clip.seconds, clip.seed)));
  const created = clip.sample.time.toISOString();
  ffmpeg([
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-f', 'f32le', '-ar', String(RATE), '-ac', '2', '-i', wav,
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '25', '-pix_fmt', 'yuv420p', '-g', String(FPS),
    '-c:a', 'aac', '-b:a', '96k',
    '-metadata', `creation_time=${created}`, '-metadata:s:v', 'handler_name=GoPro AVC', '-metadata:s:a', 'handler_name=GoPro AAC',
    '-movflags', '+faststart', '-shortest', join(outDir, clip.file),
  ], Buffer.concat(frames));
  console.log(`${clip.file}: ${clip.key}, ${clip.seconds} s, filmed ${created} at ${(clip.sample.dist / 1000).toFixed(2)} km`);
}

if (want('photo')) {
  // A phone photo from the top: larger than the clips, one frame of the ridge a few seconds on.
  let last;
  renderScene('ridge', { width: 1600, height: 1200, fps: 4, seconds: 1, seed: 19, start: 30, onFrame: (b) => (last = b) });
  ffmpeg(['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1600x1200', '-i', '-', '-q:v', '4', join(outDir, 'IMG_2231.jpg')], last);
  console.log('IMG_2231.jpg: photo from the ridge');
}

if (want('music')) {
  const wav = join(tmp, 'music.f32');
  writeFileSync(wav, pcm(musicBed(20)));
  ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '2', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '128k',
    '-metadata', 'title=Valley Floor', '-metadata', 'artist=Strata Vid fixtures', join(outDir, 'valley-floor.mp3')]);
  console.log('valley-floor.mp3: 20 s music bed');
}

writeFileSync(join(outDir, 'clips.json'), JSON.stringify(Object.fromEntries(CLIPS.map((c) => [c.file, {
  scene: c.key, seconds: c.seconds, created: c.sample.time.toISOString(), km: Number((c.sample.dist / 1000).toFixed(3)),
  lat: Number(c.sample.lat.toFixed(6)), lon: Number(c.sample.lon.toFixed(6)), ele: Number(c.sample.ele.toFixed(1)),
}])), null, 2) + '\n');
rmSync(tmp, { recursive: true, force: true });
