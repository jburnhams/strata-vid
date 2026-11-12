// Visual tests for the editor, run by strata-react's `strata-visual` (the same runner strata-react
// tests itself with). The editor is one screen whose state lives in the browser, so each shot is a
// state reached by doing what a person does: add files, put them on the timeline, drag and trim
// clips, play and step, edit the inspector, look at the map, export. Every state is taken light
// and dark at 1440×900 (the editor's grid is desktop-only). Steps are in tests/visual/flows.ts,
// media in tests/fixtures/media, map tiles drawn by tests/visual/tiles.mjs.
//
//   npm run build && npx strata-visual            compare with tests/visual/baselines
//   npm run build && npx strata-visual --update   write new baselines (look at them first)
import { readFile } from 'node:fs/promises';
import { defineVisualConfig, type RouteState } from 'strata-react/visual';
import {
  FILES, addFiles, addToTimeline, buildEdit, closeToasts, serveTiles, chooseFile, clip, drag, expect, libraryItem, playhead, restPointer, seekTo, useScheme, waitForFrames,
} from './tests/visual/flows';

/** Matches the route to the first clip's recorded time from the sync panel, and checks where that puts the clip's start. */
const syncRouteToFootage = async (page: import('playwright').Page) => {
  await page.getByRole('button', { name: `Match ${FILES.lane}'s recorded time` }).click();
  // GX010412 was recorded at 06:43:38, 150 s after the route's first point (06:41:08).
  const into = await page.getByRole('textbox', { name: 'Clip starts into the route' }).inputValue();
  expect(into === '150', `the route clip should start 150 s into the route, not ${into}`);
};

const fit = async (page: import('playwright').Page) => {
  await page.getByRole('button', { name: 'Fit to view' }).click();
};

const states: Record<string, RouteState> = {
  // A new project: the empty library, stage and timeline say what to do first.
  empty: { setup: restPointer },

  // Import: three clips, the route and a music bed load; a phone photo is refused with the reason.
  imported: {
    setup: async (page) => {
      await addFiles(page, [FILES.lane, FILES.woods, FILES.ridge, FILES.gpx, FILES.music]);
      await chooseFile(page, FILES.photo);
      await libraryItem(page, FILES.lane).click();
      await restPointer(page);
    },
  },

  // A GPX file selected in the library: its distance, climb and times in the inspector.
  'gpx-details': {
    setup: async (page) => {
      await addFiles(page, [FILES.gpx]);
      await libraryItem(page, FILES.gpx).click();
      await restPointer(page);
    },
  },

  // Add to timeline: the clips land end to end, the first frame is on the stage.
  timeline: {
    setup: async (page) => {
      await buildEdit(page);
      await fit(page);
      await seekTo(page, 2);
      await restPointer(page);
    },
  },

  // A clip chosen on the timeline: the inspector edits it (volume, sync, position and look).
  'clip-selected': {
    setup: async (page) => {
      await buildEdit(page);
      await fit(page);
      await clip(page, FILES.woods).click();
      await seekTo(page, 11);
      await restPointer(page);
    },
  },

  // Dragging a clip onto its neighbour: refused while dragging, with the reason (pointer held).
  'move-refused': {
    setup: async (page) => {
      await buildEdit(page);
      await fit(page);
      const target = clip(page, FILES.ridge);
      const lane = await clip(page, FILES.lane).boundingBox();
      const box = await target.boundingBox();
      await drag(page, target, (lane!.x + 20) - (box!.x + 4), 0, { release: false });
    },
  },

  // Move: the music clip, on its own audio track from 0:00, dragged two seconds right.
  'clip-moved': {
    setup: async (page) => {
      await buildEdit(page);
      await fit(page);
      const lane = await clip(page, FILES.lane).boundingBox();
      // Two seconds' worth of pixels at this zoom: the 8 s lane clip's width / 4.
      await drag(page, clip(page, FILES.music), lane!.width / 4);
      const after = await clip(page, FILES.music).getAttribute('aria-label');
      // Labels floor to the second and a drag lands on a frame, so two seconds reads 0:01 or 0:02.
      expect(/0:0[12] to 0:2[12]/.test(after ?? ''), `the music clip should start about 0:02 after the move, not "${after}"`);
      await restPointer(page);
    },
  },

  // Trim: the woods clip's end dragged in by two seconds; the clips after it stay put.
  'clip-trimmed': {
    setup: async (page) => {
      await buildEdit(page);
      await fit(page);
      const target = clip(page, FILES.woods);
      const box = await target.boundingBox();
      await drag(page, target, -box!.width / 4, 0, { from: 'end' });
      const label = await clip(page, FILES.woods).getAttribute('aria-label');
      expect(/0:08 to 0:14/.test(label ?? ''), `the woods clip should run 0:08 to 0:14 after the trim, not "${label}"`);
      await restPointer(page);
    },
  },

  // The clip's menu with the playhead inside it: split, crossfade, duplicate, delete.
  'clip-menu': {
    setup: async (page) => {
      await buildEdit(page);
      await fit(page);
      await seekTo(page, 12);
      await clip(page, FILES.woods).click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Split clip' }).waitFor();
    },
  },

  // Playback: play runs the clock (checked), pause stops it, frame steps land on exact frames.
  'frame-step': {
    setup: async (page) => {
      await buildEdit(page);
      await fit(page);
      await seekTo(page, 9);
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await page.waitForTimeout(1200);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      const played = await playhead(page);
      expect(played > 9.3, `playback should have moved the playhead past 0:09.3, it is at ${played}`);
      await seekTo(page, 10);
      for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Forward one frame' }).click();
      await waitForFrames(page);
      await restPointer(page);
    },
  },

  // Inspector edits: the ridge clip at half opacity, turned 4°, shown on the stage.
  'inspector-edits': {
    setup: async (page) => {
      await buildEdit(page);
      await fit(page);
      await clip(page, FILES.ridge).click();
      await seekTo(page, 18);
      // From the keyboard on the inspector's sliders: opacity down five tenths, rotation up 4°.
      const opacity = page.getByRole('slider', { name: 'Opacity' });
      for (let i = 0; i < 5; i++) await opacity.press('PageDown');
      const rotation = page.getByRole('slider', { name: 'Rotation' });
      for (let i = 0; i < 4; i++) await rotation.press('ArrowRight');
      expect(await opacity.inputValue() === '50', `opacity should read 50 (%), not ${await opacity.inputValue()}`);
      await waitForFrames(page);
      await restPointer(page);
    },
  },

  // The route on the stage: the map clip, matched to the first clip's recorded time, 5 s in.
  'map-preview': {
    setup: async (page) => {
      await buildEdit(page);
      await fit(page);
      await clip(page, FILES.gpx).click();
      await syncRouteToFootage(page);
      await seekTo(page, 5);
      await page.waitForLoadState('networkidle');
      await restPointer(page);
    },
  },

  // Map edits from the inspector: satellite tiles and the elevation profile on.
  'map-edited': {
    setup: async (page) => {
      await buildEdit(page);
      await fit(page);
      await clip(page, FILES.gpx).click();
      await syncRouteToFootage(page);
      await seekTo(page, 5);
      await page.getByRole('combobox', { name: 'Map style' }).selectOption('satellite');
      await page.getByText('Show elevation profile').click();
      expect(await page.getByRole('switch', { name: 'Show elevation profile' }).isChecked(), 'the elevation profile switch did not turn on');
      await page.waitForLoadState('networkidle');
      await restPointer(page);
    },
  },

  // Export settings changed: 720p, WebM, the encoding options open.
  'export-settings': {
    setup: async (page) => {
      await buildEdit(page);
      await page.getByRole('button', { name: 'Export video' }).click();
      const dialog = page.getByRole('dialog', { name: 'Export video' });
      await dialog.getByRole('radio', { name: '720p HD' }).click();
      await dialog.getByRole('combobox', { name: 'Container format' }).selectOption('webm');
      await dialog.getByRole('button', { name: 'Encoding' }).click();
      expect(await dialog.getByRole('textbox', { name: 'Width' }).inputValue() === '1,280', 'the 720p preset should set the width to 1,280');
      await restPointer(page);
    },
  },

  // An export run to the end: one 8 s clip at the default 1080p MP4. The dialog says how many frames
  // it saved and, in a browser with no AAC encoder (Playwright's Chromium), that the sound is Opus.
  // The file itself is checked here: a picture cannot say it has frames and sound.
  exported: {
    setup: async (page) => {
      await serveTiles(page);
      await addFiles(page, [FILES.lane]);
      await addToTimeline(page, FILES.lane);
      await closeToasts(page);
      await page.getByRole('button', { name: 'Export video' }).click();
      const dialog = page.getByRole('dialog', { name: 'Export video' });
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 120_000 }),
        dialog.getByRole('button', { name: 'Export', exact: true }).click(),
      ]);
      expect(download.suggestedFilename().endsWith('.mp4'), `the export should save an MP4, not ${download.suggestedFilename()}`);
      const size = (await readFile((await download.path())!)).length;
      expect(size > 500_000, `an 8 s 1080p export should be more than 500 kB, it is ${size} bytes`);
      await page.getByRole('dialog', { name: 'Exporting video' }).getByText('Exported', { exact: true }).waitFor();
      await restPointer(page);
    },
  },

  // Removing a file that clips use asks first, naming what goes with it.
  'remove-used-file': {
    setup: async (page) => {
      await buildEdit(page);
      await page.getByRole('button', { name: `Remove ${FILES.woods}`, exact: true }).click({ force: true });
      await page.getByRole('alertdialog').waitFor();
      await restPointer(page);
    },
  },
};

export default defineVisualConfig({
  // No frozen clock: playback and Leaflet's tile fade run on real time. The dates the editor prints
  // come from the files (addFiles stamps each with a fixed time), in the runner's own zone.
  timezone: 'Europe/London',
  locale: 'en-GB',
  app: {
    dir: 'dist',
    viewports: [{ width: 1440, height: 900 }],
    // The editor makes no fetch or XHR calls; map tiles are images, answered in serveTiles.
    onUnhandledRequest: 'bypass',
    routes: [{ name: 'editor', path: '/', setup: useScheme, states }],
  },
});

