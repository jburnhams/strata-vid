# Changelog

What changed in Strata Vid and why. Every change adds an entry here in the same PR.

Group entries by day under `## YYYY-MM-DD`, newest day first. Each entry: a bold one-line title naming
the work and its branch (and PR number once known), one or two sentences on what was asked and what
changed the plan, then bullets naming each file or folder touched and what changed. Say **new** for new
files and call out corrections to earlier claims. Plain prose. Do not rewrite older entries except to fix
a factual error. Work before 2026-11-12 is in the git history only.

## 2026-11-12

**Fix the app bugs the visual tests found** (branch `claude/project-thread-6a5jli`, PR #146, issues #141 to #145).
Jonathan asked for the app bugs listed in `docs/PORT.md` to be looked into, now that the strata-react
ones are handled elsewhere. Each was traced to its cause and fixed, with a test that would have caught it;
two framework gaps found on the way are left to strata-react.
- `src/services/WorkerCompositor.ts`, `src/workers/exportWorker.ts`: export sat at "Starting the export
  engine." because the worker fed mediabunny's `canvasesAtTimestamps` one timestamp at a time and waited
  for each answer, and the sink answers a timestamp only once it has seen the next. Each video clip now
  gets every frame time up front (`planFrames`) and the sink decodes ahead. The sound is encoded through an
  `AudioSampleSource` in one-second samples; the old code passed an input track to `addAudioTrack`. A codec
  the browser cannot encode (AAC in Playwright's Chromium and Firefox) is swapped for one the container
  takes, and the finished export says so; a video codec it cannot encode stops the export with a reason (#141).
- `src/services/ExportManager.ts`, `src/components/ExportModal.tsx`: the sound is mixed on the main thread,
  where `OfflineAudioContext` exists (workers have none, so every export was silent), and transferred to the
  worker. The finished dialog gives the real frame count (it said 0) and the notes. **Corrects** PR #140's
  note that the export hang happened "between `output.start()` and the first frame": it hung inside the
  first frame's decode (#141).
- `src/services/AssetLoader.ts`: read ffprobe's field names, which mediabunny does not have; now uses
  `getFormat().name`, `getMetadataTags().creationTime` (or `date`; anything before 1980 is treated as an
  unset clock), the tracks' async getters, and `computePacketStats` for frame rate and bitrate. A GPX file's
  date is its first timed point (#142).
- `src/App.tsx`, `src/components/LibraryPanel.tsx`, `src/types.ts` (`importOrder`): files keep the order they
  were added in; "Add to timeline" leaves the selection alone; a row's select button and its actions are
  siblings; audio and image files get their own icons (#143).
- `src/utils/timelinePlacement.ts`: **new**. Where "Add to timeline" puts a file: footage end to end on a video
  track, sound on an audio track from 0:00, a route on a "Route" track spanning the footage as a top-right
  inset (38% × 60%), since a full-frame map would hide the run it belongs to. A design choice Jonathan may
  want to change (#143).
- `src/components/MapSyncControl.tsx`: the sync field is labelled "Clip starts into the route" and takes
  seconds, with the moment it names written under it; dates go through strata's `format`; the button is
  "Match <clip>'s recorded time" (#144).
- `src/components/preview/ElevationProfile.tsx`, `src/components/MapPanel.tsx`,
  `src/components/preview/OverlayRenderer.tsx`: the profile finds the playhead as the map marker does (the
  route's clock from the sync offset, at real speed) instead of stretching the route over the clip, draws no
  rule outside the recording, and starts its height axis at a round number below the route (#144).
- `src/components/PreviewPanel.tsx`: the empty stage says "Add a clip to the timeline to see it here." (or
  "No clip at the playhead.") instead of the time in monospace (#145).
- `src/components/timeline/WaveformOverlay.tsx`: drawn in the muted foreground role at 35%, so it shows on
  light clips and the name stays readable in dark (#145).
- Tests: `tests/integration/assetMetadata.integration.test.ts` **new** (reads the real fixtures through
  mediabunny; the mocks had the code's wrong shape), `tests/unit/utils/timelinePlacement.test.ts` **new**;
  worker, compositor, export manager, asset loader, library, sync and profile tests updated to the real APIs
  and the new behaviour.
- `strata-visual.config.ts`, `tests/visual/README.md`, `tests/visual/baselines/`: new `exported` state (an 8 s
  clip exported to the end; the download is checked); the map states match the route to the footage first;
  `clip-moved` expects the music on its own track. The route's map is now an inset on the stage in most
  states, so `tests/visual/flows.ts` waits for its tiles to load and finish Leaflet's fade before a shot (CI
  caught `clip-selected` mid-fade, then mid-zoom: the dark shot skips the scheme switch, so it is taken
  sooner), with no zoom under way and the map still for a quarter of a second; `exported` puts focus on the
  footer's Close so the close icon's tooltip cannot open in the shot. All 32 baselines rewritten and looked at; two reruns matched all 32.
- Review fixes (Codex on PR #146): `ExportManager.cancel` during the sound mix now stops the export before
  the worker starts (it used to be lost, as there was no worker yet); `WorkerCompositor.renderFrame` stacks
  clips by `zIndex` after track order, as the preview does, so a route inset whose track was made before the
  footage's still draws on top in the export.
- `docs/PORT.md`, `docs/FEATURES.md`: the bug list is marked fixed; E1–E3 and M8 are Done again.
- Not fixed here, framework gaps: strata-react's LineChart labels its last point "now" (wrong for a
  profile), and Leaflet's attribution covers much of the small route inset (the map moves to strata-react #80).
  The intake outcome list that pushes the library down (#143's suggestion) is strata-react's `FileOutcomes`.

**Visual tests of the editor's interactive flows** (branch `claude/project-thread-7f6m6w`, PR #140). Jonathan asked
for visual testing "using common-react", covering interactive flows, with realistic generated test clips
checked by eye. No repository or package of his is called common-react, so this uses strata-react's
`strata-visual`, the runner strata-react tests itself with. Jonathan approved the new dev dependencies
(`playwright` pinned at 1.63.0, the two Overpass font packages); `msw` is not needed.
- `strata-visual.config.ts`: **new**. 15 states of the editor reached by doing what a person does (drop
  files, refuse a photo, add to the timeline, drag a clip, a refused move with its reason, trim, the clip
  menu, play and step frames, inspector edits, the map and its style and profile, export settings, removing
  a used file), each light and dark at 1440×900: 30 shots, about 40 s. Steps also check what a picture
  cannot (playback moved, a clip's new span).
- `tests/visual/flows.ts`, `tests/visual/tiles.mjs`, `tests/visual/README.md`: **new**. The shared steps;
  map tiles drawn from the fixtures' valley in the app's three styles so no shot touches a tile server;
  how it all stays deterministic (files dropped with fixed times, one at a time; no frozen clock, which
  would stop playback and Leaflet's tile fade; light shots pick Light, as the app's ThemeProvider
  defaults to dark and owns the class).
- `tests/visual/baselines/`: **new**, 30 PNGs, each looked at before committing.
- `scripts/fixtures/` (`terrain.mjs`, `route.mjs`, `scene.mjs`, `sound.mjs`, `make-media.mjs`): **new**. Generates the
  media from code: an invented valley, a 6.4 km GPX run over it with Garmin heart rate and cadence, three
  GoPro-style H.264/AAC clips of chest-camera footage filmed along it (bob at the runner's cadence,
  footfalls on the same beat, wind, birds), a music bed and a phone photo. Needs ffmpeg; nothing from npm.
- `tests/fixtures/media/`: **new**, the generated files (2.4 MB, committed rather than generated per run,
  which takes about four minutes) and a README.
- `src/theme.css`, `src/main.tsx`: the app's faces are now Overpass and Overpass Mono, bundled, so text is
  the same on every machine (the runner fails text drawn in a machine font).
- `src/index.css`, `src/components/MapPanel.tsx`: two app changes the tests needed: the map uses the app's
  face instead of Leaflet's Helvetica stack, and the elevation-profile toggle is a lucide icon instead of
  the 🏔️ emoji (an emoji is drawn by the machine's emoji font).
- `package.json`, `package-lock.json`: `test:visual` script; dev dependencies `playwright` (exact),
  `@fontsource-variable/overpass`, `@fontsource-variable/overpass-mono`.
- `.github/workflows/visual.yml`: **new**, runs the suite on Node 26 and uploads changed shots as
  `visual-diffs`. `.gitignore`: `tests/visual/output`.
- `docs/PORT.md`: an "App bugs noted" section with eleven bugs the tests turned up, noted not fixed. The
  largest: export stays at "Starting the export engine." and never renders a frame, and export audio
  is always dropped (the worker has no `OfflineAudioContext`).
- `docs/FEATURES.md`: **corrections**: E1–E3 (export) and M8 (audio in export) were marked Done; both are
  now Partial, with the reason.
- `README.md`: the `test:visual` command.
- Not covered yet: running an export (blocked by the bug above) and the keyboard shortcuts sheet (its ← and
  → are outside the bundled faces' character set, so they fall back to a machine font).

**Docs slimmed to what is true now** (branch `claude/project-thread-snbsl3`, PR #139). Jonathan asked for a
review of the project's docs and chose to slim and rewrite them: the README still called the app early
development and listed export, audio and save/load as planned; the roadmap contradicted its own section
files and its links were broken.
- `README.md`: rewritten. Says what the editor does, the known gaps, how to run it, the stack including
  strata-react, and the contributor rules. **Corrections**: export, audio, save/load and undo exist;
  integration tests are Jest in jsdom, not Playwright; Node 26, not 20.
- `docs/ARCHITECTURE.md`: rewritten from the code. Keeps the data model, GPX sync and the two renderers;
  adds the worker export (`WorkerCompositor`, `exportWorker`), the audio graph, saving, and the current
  layout. **Corrections**: `Clip.syncOffset` is the absolute GPX time (epoch ms) at the clip's start, not
  an offset in seconds; `Compositor.ts` is used only by its tests.
- `docs/PORT.md`: **new**. Where the move onto strata-react stands: what is in use (including what
  PR #138 swapped in, #75–#79), and what waits on strata-react (#68, #80, #81, #116, #117, #121, #122).
- `docs/FEATURES.md`: **new**, added after Jonathan asked that the removed sections be kept as a record.
  One row per planned feature under its old ID (A2…M9, L1–L5) with its status checked against the code.
  **Corrections** to the old section files: H5 speed and H7 filters are partial (rendered, no control
  sets them), H8 keyframes is done, G6 dark mode is done (by #137), J6 frame dropping has no code that
  names it, and Section I's open items were done under M.
- `CHANGELOG.md`: **new**, seeded with PR #137 below.
- `AGENTS.md`: adds the changelog, dependency and port rules.
- Removed: `docs/IMPLEMENTATION.md`, `docs/QUICKSTART.md`, `docs/complete/` and `docs/sections/` (the
  A–M task lists; their features and status are now `docs/FEATURES.md`), and the app template's leftovers
  `QUICK_START.md`, `TEMPLATE_CUSTOMIZATION.md` and `.env.example` (the app reads no environment variables).
  All are in git history.
- `.node-version`: 20 → 26, to match `.nvmrc` and `engines`.
- Brought up to date with PR #138 once it merged: README, ARCHITECTURE and PORT describe the
  strata-react timeline, transport, stage, file intake and chart, and no longer mention `@dnd-kit`.

**Swap in strata-react's file intake, transport, chart and timeline** (branch
`claude/project-thread-nyofjj`, PR #138). The second port step:
the components released in strata-react 1.0.10 and 1.0.11 (#75, #77, #78, #79) replace the app's own,
and `@dnd-kit` is removed (#76). Details and behaviour changes are in the PR and `docs/PORT.md`; gaps
found were filed as strata-react #121 and #122.

**First move onto strata-react** (branch `claude/project-thread-nyofjj`, PR #137). Every dependency
updated, Node 26, TypeScript 7, and strata-react 1.0.6's released components in place of hand-built ones.
- `package.json`: strata-react with React Router and TanStack Query as its peers; ts-jest removed
  (unused, no TypeScript 7 release; Jonathan approved).
- `src/index.css`, `src/theme.css`, `src/theme.generated.css`, `src/main.tsx`, `index.html`: strata-react's
  roles and a theme seeded from OS-map contour orange; dark by default.
- `src/components/`: one command list drives keys, menus, the context menu, the command menu and the
  shortcuts dialog; `Dialog`/`AlertDialog`, toasts and `Alert`, toolbars and toggles, `NumberField`,
  `Slider` and `ColorField` with units, the `Inspector`, and export as a `JobStatus`. Compact density, a
  wider track header, and an inspector that no longer overflows.
- `jest.base.config.js`, `tests/utils/babelImportMeta.cjs`: Jest compiles ESM-only packages and removes
  `import.meta`. Integration tests query by role and name.
- Framework gaps found were filed as strata-react #116 and #117.
