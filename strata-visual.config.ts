// Visual tests for the editor, run by strata-react's `strata-visual` (the same runner strata-react
// tests itself with). The editor is one screen whose state lives in the browser, so each shot is a
// state reached by doing what a person does: add files, put them on the timeline, drag and trim
// clips, play and step, edit the inspector, look at the map, export. Every state is taken light
// and dark at 1440×900 (the editor's grid is desktop-only). Steps are in tests/visual/flows.ts,
// media in tests/fixtures/media, map tiles drawn by tests/visual/tiles.mjs.
//
//   npm run build && npx strata-visual            compare with tests/visual/baselines
//   npm run build && npx strata-visual --update   write new baselines (look at them first)
import { defineVisualConfig, type RouteState } from 'strata-react/visual';
import {
  FILES, addFiles, buildEdit, chooseFile, clip, drag, expect, libraryItem, playhead, restPointer, seekTo, useScheme, waitForFrames,
} from './tests/visual/flows';

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

  // Move: the music clip, last on the track, dragged two seconds right leaves a gap before it.
  'clip-moved': {
    setup: async (page) => {
      await buildEdit(page);
      await fit(page);
      const lane = await clip(page, FILES.lane).boundingBox();
      // Two seconds' worth of pixels at this zoom: the 8 s lane clip's width / 4.
      await drag(page, clip(page, FILES.music), lane!.width / 4);
      const after = await clip(page, FILES.music).getAttribute('aria-label');
      // Labels floor to the second and a drag lands on a frame, so two seconds reads 0:33 or 0:34.
      expect(/0:3[34] to 0:5[34]/.test(after ?? ''), `the music clip should start about 0:34 after the move, not "${after}"`);
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

  // The route on the stage: the map clip under the playhead, its inspector open.
  'map-preview': {
    setup: async (page) => {
      await buildEdit(page);
      await fit(page);
      await clip(page, FILES.gpx).click();
      await seekTo(page, 27);
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
      await seekTo(page, 27);
      await page.getByRole('combobox', { name: 'Map style' }).selectOption('satellite');
      await page.getByText('Show elevation profile').click();
      expect(await page.getByRole('switch', { name: 'Show elevation profile' }).isChecked(), 'the elevation profile switch did not turn on');
      await page.waitForLoadState('networkidle');
      await restPointer(page);
    },
  },

  // Export settings changed: 720p, WebM, the encoding options open. (Running the export is not a
  // state yet: it stays at "Starting the export engine." in this app today; see the CHANGELOG.)
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

  // Removing a file that clips use asks first, naming what goes with it.
  'remove-used-file': {
    setup: async (page) => {
      await buildEdit(page);
      await page.getByRole('button', { name: `Remove ${FILES.woods}`, exact: true }).click({ force: true });
      await page.getByRole('alertdialog').waitFor();
      await restPointer(page);
    },
  },

  // The keyboard shortcuts sheet.
  shortcuts: {
    setup: async (page) => {
      await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
      await page.getByRole('dialog').waitFor();
      await restPointer(page);
    },
  },
};

export default defineVisualConfig({
  systemFonts: 'warn', // SCRATCH until the font packages are approved
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

