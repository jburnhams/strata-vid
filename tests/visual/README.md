# Visual tests

Screenshots of the editor in the states a person reaches by using it, compared with committed baselines
by strata-react's `strata-visual` (the runner strata-react tests itself with; see its README,
"Visual regression for apps"). The states are in [`strata-visual.config.ts`](../../strata-visual.config.ts)
at the repository root, the steps they are built from in [`flows.ts`](flows.ts), the media in
[`tests/fixtures/media`](../fixtures/media/README.md).

```sh
npm run build && npm run test:visual            # compare with tests/visual/baselines
npm run build && npm run test:visual -- --update  # write new baselines; look at every one first
npm run test:visual -- --filter map             # only shots whose name contains "map"
```

Changed shots land in `tests/visual/output/` as `.actual`, `.expected` and `.diff` PNGs (CI uploads them
as the `visual-diffs` artifact). Baselines are written in the Chromium that the pinned `playwright`
installs (`npx playwright install chromium`), the same one CI uses.

## What is covered

Each state is taken light and dark at 1440×900 (the editor's grid is desktop-only), 32 shots in about 40 s.

| State | What a person did | Checked beyond the picture |
|---|---|---|
| `empty` | Opened the editor | |
| `imported` | Dropped three clips, the GPX and the music on the library; chose a phone photo with "Add files" | the photo is refused with its reason |
| `gpx-details` | Dropped the GPX and selected it | |
| `timeline` | Put everything on the timeline with "Add to timeline", fitted it, moved to 0:02 | each clip appears |
| `clip-selected` | Clicked the woods clip, moved to 0:11 | |
| `move-refused` | Is dragging the ridge clip onto the first clip (pointer still down) | |
| `clip-moved` | Dragged the music clip two seconds right | the clip's new start |
| `clip-trimmed` | Dragged the woods clip's end in by two seconds | the clip's new span |
| `clip-menu` | Right-clicked the woods clip with the playhead inside it | |
| `frame-step` | Played from 0:09 for a second, paused, went to 0:10, stepped three frames | playback moved the playhead |
| `inspector-edits` | Set the ridge clip to 50% opacity and 4° from the keyboard | the opacity value |
| `map-preview` | Selected the route clip with the playhead on it | |
| `map-edited` | Chose satellite tiles and turned on the elevation profile | the switch is on |
| `export-settings` | Opened Export, chose 720p and WebM, opened Encoding | the preset's width |
| `remove-used-file` | Removed a file the timeline uses | |
| `shortcuts` | Opened the keyboard shortcuts | |

Not yet a state: **running an export**. It stays at "Starting the export engine." in this app today
(see the CHANGELOG, 2026-11-12); add the state when that is fixed.

## How the states stay the same on every run

- **Files are dropped, not chosen**, as bytes with a fixed `lastModified` (`MODIFIED` in `flows.ts`). The
  editor shows a file's time when it reads none from the file, and the file chooser would stamp it with
  the moment of the run. Only the refused photo goes through the chooser, as its time never shows.
  A drop built in the page has no file-system entry, which React Aria's drop zone requires of a file, so
  `addFiles` gives such items the entry a desktop drop would have.
- **One file at a time**: the library lists files in the order they finish loading, so files added
  together land in a race order.
- **Map tiles are drawn, not fetched** (`tiles.mjs`): every request to the app's three tile servers is
  answered with a tile of the fixtures' valley in the style asked for (paper topo, dark, aerial).
- **No frozen clock**: playback runs on `performance.now()` and Leaflet fades tiles in on `Date`, so a
  frozen clock would stop both. Nothing the shots show depends on today's date.
- **Light shots pick Light** in the header (`useScheme`): the editor's `ThemeProvider` defaults to dark and
  owns the `dark` class, so the runner's own scheme switch does not reach it.
- **Seeking is by keyboard on the seek bar** (whole seconds), and every step waits for the preview's
  videos to have their frame decoded before the shot.
- The pointer is moved off the panels before a shot, so no row is in its hover state.
