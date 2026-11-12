// The steps the visual states are built from: what a person does in the editor, written once and
// shared, so each state is "the steps so far" and a failure names the step that broke. Every step
// waits for what it caused (a library row, a clip on the timeline, a decoded frame) instead of
// sleeping, and checks it where a screenshot alone could not tell (playback advanced, a clip moved
// by the amount dragged). Media comes from tests/fixtures/media (scripts/fixtures/make-media.mjs).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Locator, Page } from 'playwright';
import type { Shot } from 'strata-react/visual';
// @ts-expect-error: a plain ES module shared with the fixture scripts, no types
import { TILE_HOSTS, tileFor } from './tiles.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MEDIA = join(here, '..', 'fixtures', 'media');

const MIME: Record<string, string> = { mp4: 'video/mp4', gpx: 'application/gpx+xml', mp3: 'audio/mpeg', jpg: 'image/jpeg' };

/** The fixture files, by what they are. */
export const FILES = {
  lane: 'GX010412.MP4',
  woods: 'GX010413.MP4',
  ridge: 'GX010414.MP4',
  gpx: 'ridge-loop.gpx',
  music: 'valley-floor.mp3',
  photo: 'IMG_2231.jpg',
} as const;
type FileName = (typeof FILES)[keyof typeof FILES];

/**
 * Answers the map's tile requests with tiles drawn from the fixtures' valley (tiles.mjs), so the
 * map is the same on every machine and never touches a tile server.
 */
export async function serveTiles(page: Page) {
  await page.route(TILE_HOSTS, (route) =>
    route.fulfill({ body: tileFor(route.request().url()), contentType: 'image/png', headers: { 'access-control-allow-origin': '*' } }),
  );
}

/**
 * Shows the shot's scheme. The editor is dark until a person picks otherwise (ThemeProvider owns
 * the class, so the runner's own light/dark switch cannot reach it): a light shot picks Light in
 * the header's Appearance choice, as a person would.
 */
export async function useScheme(page: Page, shot: Shot) {
  if (shot.theme !== 'light') return;
  const light = page.getByRole('radio', { name: 'Light' });
  await page.locator('label').filter({ has: light }).click();
  await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
  await restPointer(page);
}

/** Puts the pointer somewhere neutral, so no row is left in its hover state for the shot, and lets the route's map settle. */
export async function restPointer(page: Page) {
  await page.mouse.move(2, 898);
  await waitForMapTiles(page);
}

/**
 * The route's map is an inset on the stage over the footage whenever the playhead is on it. Waits
 * until it has settled: Leaflet's zoom to the route's bounds has ended (a dark shot, which skips the
 * scheme switch, was taken mid-zoom on CI), only one zoom level's tiles are left, and each tile has
 * loaded and finished its fade-in. All of these run on real time.
 */
export async function waitForMapTiles(page: Page) {
  const settled = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="preview"] .leaflet-container')].map((map) => {
        const levels = [...map.querySelectorAll('.leaflet-tile-container')].filter((level) => level.children.length > 0);
        const tiles = [...map.querySelectorAll<HTMLImageElement>('img.leaflet-tile')];
        const ready = !map.classList.contains('leaflet-zoom-anim') && levels.length === 1 && tiles.length > 0
          && tiles.every((tile) => tile.complete && tile.classList.contains('leaflet-tile-loaded') && getComputedStyle(tile).opacity === '1');
        return ready ? (map.querySelector<HTMLElement>('.leaflet-map-pane')?.style.transform ?? '') : null;
      }),
    );
  // Settled, and still the same a quarter of a second later (no pan or zoom under way).
  for (let tries = 0; tries < 100; tries++) {
    const first = await settled();
    if (!first.includes(null)) {
      await page.waitForTimeout(250);
      if (JSON.stringify(await settled()) === JSON.stringify(first)) return;
    } else {
      await page.waitForTimeout(100);
    }
  }
  throw new Error('the route map on the stage did not settle');
}

/** A library row by file name. */
export const libraryItem = (page: Page, name: string) => page.getByTestId(/^asset-item-/).filter({ hasText: name });

/**
 * When each file was last written, as it would be on a card copied off the camera or a download:
 * a clip's at the end of its recording, the GPX when it was exported from the watch's app, the
 * music long before. The editor falls back to this time when it reads no date from the file, so a
 * fixed value keeps the inspector's "Created" the same on every run.
 */
const MODIFIED: Record<string, string> = {
  'GX010412.MP4': '2026-05-03T06:43:46Z',
  'GX010413.MP4': '2026-05-03T06:49:40Z',
  'GX010414.MP4': '2026-05-03T07:06:16Z',
  'ridge-loop.gpx': '2026-05-03T08:02:11Z',
  'valley-floor.mp3': '2025-11-20T21:14:05Z',
  'IMG_2231.jpg': '2026-05-03T07:05:51Z',
};

const mimeOf = (name: string) => MIME[name.split('.').pop()!.toLowerCase()];

/**
 * Drops files on the library's drop zone, one at a time as a person dragging them in over a
 * session would (the library lists files in the order they finish loading, so dropping them
 * together would make the order a race). Waits for each row, and for a video's thumbnail.
 */
export async function addFiles(page: Page, names: FileName[]) {
  // A drop from the desktop carries file-system entries; a DataTransfer built in the page does not,
  // and React Aria's drop zone skips a file item without one. Give such items the entry a desktop
  // drop would have.
  await page.evaluate(() => {
    const proto = DataTransferItem.prototype as DataTransferItem & { __entry?: boolean };
    if (proto.__entry) return;
    const real = proto.webkitGetAsEntry;
    proto.webkitGetAsEntry = function (this: DataTransferItem) {
      return real.call(this) ?? (this.kind === 'file' ? ({ isFile: true, isDirectory: false } as FileSystemEntry) : null);
    };
    proto.__entry = true;
  });
  for (const name of names) {
    // The drop zone itself (its title's parent): while a drag is over it the title changes.
    const zone = (await page.getByText(/^Drag (videos, audio or GPX tracks|more files) here$/).locator('xpath=..').elementHandle())!;
    const transfer = await page.evaluateHandle(
      ({ name, type, b64, lastModified }) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const dt = new DataTransfer();
        dt.items.add(new File([bytes], name, { type, lastModified }));
        return dt;
      },
      { name, type: mimeOf(name), b64: readFileSync(join(MEDIA, name)).toString('base64'), lastModified: Date.parse(MODIFIED[name]) },
    );
    for (const type of ['dragenter', 'dragover', 'drop'] as const) await zone.dispatchEvent(type, { dataTransfer: transfer });
    await transfer.dispose();
    await zone.dispose();
    await settleFile(page, name);
  }
}

/**
 * Adds a file through the "Add files" button and the file chooser. Only for a file whose time does
 * not show (the chooser stamps it with the moment it was chosen).
 */
export async function chooseFile(page: Page, name: FileName) {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Add files', exact: true }).click()]);
  await chooser.setFiles({ name, mimeType: mimeOf(name), buffer: readFileSync(join(MEDIA, name)) });
  await settleFile(page, name);
}

async function settleFile(page: Page, name: string) {
  const ext = name.split('.').pop()!.toLowerCase();
  if (ext === 'jpg') {
    await page.getByText(`${name} is not a type this accepts.`).waitFor();
    return;
  }
  const row = libraryItem(page, name);
  await row.waitFor();
  if (ext === 'mp4') await waitForImage(row.getByRole('img', { name: `Thumbnail for ${name}` }));
}

async function waitForImage(img: Locator) {
  await img.waitFor();
  await img.evaluate((el: HTMLImageElement) => (el.complete && el.naturalWidth ? undefined : new Promise((r) => el.addEventListener('load', r, { once: true }))));
}

/** "Add to timeline" on a library row; waits for the clip to be on the timeline. */
export async function addToTimeline(page: Page, name: FileName) {
  await page.getByRole('button', { name: `Add ${name} to timeline`, exact: true }).click({ force: true });
  await clip(page, name).waitFor();
}

/** A clip on the timeline by its file name (strata's Timeline names each "name, from to to, lane"). */
export const clip = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name.replace('.', '\\.')}, `) });

/** Closes the toasts, which would otherwise be in the shot for as long as their timers run. */
export async function closeToasts(page: Page) {
  const region = page.getByRole('region', { name: /notifications/i });
  for (let i = 0; i < 20; i++) {
    const close = region.getByRole('button', { name: /close|dismiss/i }).first();
    if (!(await close.isVisible().catch(() => false))) return;
    await close.click();
  }
}

/** Waits until every video in the preview has the frame for its current time decoded, and the route's map tiles have faded in. */
export async function waitForFrames(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLVideoElement>('[data-testid="preview"] video')].every((v) => !v.seeking && v.readyState >= 2),
  );
  await waitForMapTiles(page);
  // One more frame for the compositor to paint what was decoded.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** The playhead's time in seconds, read from the seek bar. */
export async function playhead(page: Page): Promise<number> {
  return Number(await page.getByRole('slider', { name: 'Playhead' }).inputValue());
}

/**
 * Moves the playhead to a whole second from the keyboard, on the transport's seek bar (Home, then
 * one second per arrow press), and checks it got there.
 */
export async function seekTo(page: Page, seconds: number) {
  const bar = page.getByRole('slider', { name: 'Playhead' });
  await bar.focus();
  await bar.press('Home');
  for (let i = 0; i < seconds; i++) await bar.press('ArrowRight');
  const at = await playhead(page);
  expect(Math.abs(at - seconds) < 1e-6, `the playhead should be at ${seconds} s, it is at ${at}`);
  await bar.blur();
  await waitForFrames(page);
}

/** The full edit used by most states: every file in, the clips and the route on the timeline. */
export async function buildEdit(page: Page) {
  await serveTiles(page);
  await addFiles(page, [FILES.lane, FILES.woods, FILES.ridge, FILES.gpx, FILES.music]);
  for (const name of [FILES.lane, FILES.woods, FILES.ridge, FILES.gpx, FILES.music]) await addToTimeline(page, name);
  await closeToasts(page);
}

/** Drags from the middle of a box by dx, dy pixels in small steps, as a hand does. */
export async function drag(page: Page, target: Locator, dx: number, dy = 0, opts: { from?: 'middle' | 'end' | 'start'; release?: boolean } = {}) {
  const box = await target.boundingBox();
  if (!box) throw new Error('nothing to drag');
  const x = opts.from === 'end' ? box.x + box.width - 2 : opts.from === 'start' ? box.x + 2 : box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x + (dx * i) / 10, y + (dy * i) / 10);
  if (opts.release !== false) await page.mouse.up();
}

/** Fails the shot with a sentence when a step did not do what it should. */
export function expect(ok: boolean, sentence: string) {
  if (!ok) throw new Error(sentence);
}
