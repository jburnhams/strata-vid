# Changelog

What changed in Strata Vid and why. Every change adds an entry here in the same PR.

Group entries by day under `## YYYY-MM-DD`, newest day first. Each entry: a bold one-line title naming
the work and its branch (and PR number once known), one or two sentences on what was asked and what
changed the plan, then bullets naming each file or folder touched and what changed. Say **new** for new
files and call out corrections to earlier claims. Plain prose. Do not rewrite older entries except to fix
a factual error. Work before 2026-11-12 is in the git history only.

## 2026-11-12

**Reorder tracks** (branch `claude/project-thread-3drc3w`).
The last feature Jonathan kept (B6b). Track order is also the drawing order, so this is how a route inset goes
over or under footage. strata-react's Timeline has no lane drag, so it is two buttons, which work by keyboard.
- `src/store/slices/timelineSlice.ts`, `src/store/types.ts`: `moveTrack(id, -1 | 1)`; one undo step,
  "reorder tracks".
- `src/components/timeline/TrackHeader.tsx`, `src/components/TimelinePanel.tsx`: "Move up" and "Move down"
  in the track's settings popover, disabled at either end, with "Lower tracks draw over higher ones."
- Tests: **new** `tests/unit/store/moveTrack.test.ts`; `tests/unit/components/timeline/TrackHeader.test.tsx`.
- No baseline changed (no visual state opens a track's settings). `docs/FEATURES.md`, `docs/PORT.md`,
  `README.md`: updated.

**Clip speed and colour controls** (branch `claude/project-thread-3drc3w`).
Two of the features Jonathan kept (H5, H7): both already rendered and had no control. Speed needed the map to
follow it, which found that the preview and export counted a route clip's time differently.
- `src/utils/routeClock.ts`: **new**. A route clip's clock runs at the speed of the top video clip under it
  (1× where there is none) and starts at the clip's own trim, with the inverse for seeking. **Corrects** the
  preview, which counted `t - clip.start` and so restarted a split route clip, while the export counted its
  trim; both now use this.
- `src/components/preview/OverlayRenderer.tsx`, `src/components/PreviewPanel.tsx`,
  `src/services/WorkerCompositor.ts`: map, data overlay, elevation profile and the exported map use the route
  clock; a pick on the profile seeks through its inverse.
- `src/components/ClipSpeedRow.tsx`: **new**. "Speed" for a video clip, 0.25× to 8×; a slower speed that would
  run into the next clip is refused with that clip named, unless overlaps are allowed.
- `src/components/preview/VideoPlayer.tsx`: a clip at another speed no longer keeps its pitch in preview, so
  it sounds as the export mixes it (a Web Audio source at that rate).
- `src/utils/colourFilter.ts`, `src/components/ClipColourRows.tsx`: **new**. Brightness, contrast and
  saturation (0 to 200%) for video and image clips, read from and written to the clip's CSS `filter`, keeping
  any other filter functions an older project had.
- `src/components/MetadataPanel.tsx`: new Colour and Timing sections. `src/utils/historyLabels.ts`: "change
  speed" is told apart before "trim clip" (speed also changes the length); a filter change is "change colour".
- Tests: **new** `tests/unit/utils/routeClock.test.ts`, `tests/unit/utils/colourFilter.test.ts`,
  `tests/unit/components/ClipSpeedRow.test.tsx`, `tests/unit/components/ClipColourRows.test.tsx`.
- `tests/visual/baselines/`: `clip-selected` and `inspector-edits` (light and dark) re-recorded: the
  inspector shows the Colour section.
- `docs/FEATURES.md` (H5, H7), `docs/PORT.md`, `README.md`: updated. Not done: watching a 2× clip's map in a
  browser by eye.

**Drag library files onto the timeline; taller lanes and fixed kind colours** (branch `claude/project-thread-3drc3w`).
The last strata-react swap available now (#121). The drag source is the browser's own drag on the library
row, read by React Aria's drop target in strata's Timeline: React Aria's `useDrag` (as strata-react's own
story uses) would need `react-aria` as a direct dependency, which is Jonathan's call, so the keyboard keeps
"Add to timeline".
- `src/components/LibraryPanel.tsx`: a file's row is draggable, carrying its id as
  `application/x-strata-vid-asset`; the store remembers which file is being dragged.
- `src/components/TimelinePanel.tsx`: `dropTypes`, `onDrop` (the clip lands at the snapped time, and is
  selected), `validateDrop` (locked track, sound on a picture track or the reverse, an overlap), `dropLength`
  from the file; `laneRows={2}`; `kindColours` from the library's media colours. A trim from the start is now
  one store change (`resizeClip` takes the new start), so it is one undo step.
- `src/utils/timelinePlacement.ts`: `ASSET_DRAG_TYPE`, `refuseOnTrack`, `lengthOf` and `clipAt` (**new**
  exports); "Add to timeline" is unchanged.
- `src/store/types.ts`, `src/store/slices/uiSlice.ts`, `src/store/slices/timelineSlice.ts`: `draggedAssetId`
  and `setDraggedAsset`; `resizeClip`'s optional `newStart`.
- `src/App.tsx`: the timeline pane starts 330px high (was 240) so three two-row lanes fit.
- Tests: **new** `tests/integration/timelineDrop.test.tsx` (a drop lands where it should; footage over an
  audio lane is refused with the reason); `tests/unit/utils/timelinePlacement.test.ts` covers the new helpers.
- `tests/visual/baselines/`: all 32 re-recorded after looking at them: taller lanes with room for thumbnails
  and the waveform, stripes in the library's colours (blue footage, orange route, pink sound) in both
  schemes, and a shorter stage. A second run matched all 32.
- `docs/PORT.md`, `docs/FEATURES.md`, `README.md`: updated.

**Undo, redo and auto-save on strata-react's history and save state** (branch `claude/project-thread-3drc3w`).
The next port swap (strata-react #81). The map swap (#80) was tried first and stopped: `RouteMap` cannot
hold the clip's zoom on the runner or show one marker per track, so that is strata-react #161 and the
Leaflet panel stays for now.
- `src/store/middleware/historyMiddleware.ts`: rewritten. It no longer keeps its own stacks; it reports
  each change to the document (now including markers) as a before/after pair and restores a side quietly,
  keeping playback, the selection where it still exists, and each file's current thumbnail. Opening a
  project reports a reset. **Corrects** the old behaviour, where undo also put back the playhead and the
  playing state, and a thumbnail arriving after a file was added became an undo step.
- `src/utils/historyLabels.ts`: **new**. Names a change from what differs ("trim clip", "change opacity",
  "ripple delete") and keys continuous controls so a slider drag merges into one step.
- `src/hooks/useDocumentHistory.ts`: **new**. strata-react `useHistory` (50 steps) fed by the store.
- `src/hooks/useAutoSave.ts`: on strata-react's `useAutoSave` and `useLeaveGuard`: saves 1.5 s after a
  change instead of every 60 s, says why a save failed (storage full), and an empty project removes the save.
- `src/hooks/useKeyboardShortcuts.ts`, `src/components/EditMenu.tsx`, `src/App.tsx`: Undo and Redo are the
  history's commands, named after the step and disabled with a reason; `SaveStatus` sits in the header.
- `src/components/ProjectMenu.tsx`, `src/store/slices/projectSlice.ts`: "New project" loads an empty project
  in one step, so the history starts again instead of recording each removal; opening a project clears
  markers (they are not saved in `.svp` files yet).
- Tests: `tests/unit/store/historyMiddleware.test.ts`, `tests/unit/hooks/useAutoSave.test.ts` and
  `tests/unit/components/EditMenu.test.tsx` rewritten against the real store; **new**
  `tests/unit/utils/historyLabels.test.ts` and `tests/unit/hooks/useDocumentHistory.test.ts`;
  `tests/integration/undoRedo.integration.test.tsx` checks the step's name and the disabled Redo.
- `tests/visual/flows.ts`, `strata-visual.config.ts`: every state ends with `settleSave`, which waits for the
  save to settle and prints a fixed time in the save sign. All 32 baselines re-recorded (the header gains
  "Saved 09:30"); a second run matched all 32.
- `docs/PORT.md`, `docs/FEATURES.md` (D2, F4, F5), `docs/ARCHITECTURE.md`, `README.md`: updated.

**Editor panels as strata-react workspace panes** (branch `claude/project-thread-3drc3w`).
The first port swap after Jonathan's feature decisions (PR #147, merged). strata-react #68 is closed, so the
fixed CSS grid gave way to its `Workspace`.
- `src/App.tsx`: the header stays; below it a `Workspace` ("Editor") of a row (Library, Preview growing,
  Inspector) over the Timeline. Library, Inspector and Timeline are `collapsible`; sizes and folds are kept
  by `useWorkspaceState('strata-vid.workspace')`. A new View menu shows or hides each pane and resets the
  layout. The header's height is `h-12` (48px) instead of an arbitrary 50px.
- `src/components/LibraryPanel.tsx`: its own "Library" heading is gone, as the pane's header names it;
  "Add files" keeps its row.
- `tests/integration/accessibility.test.tsx`: the mocked panels no longer pretend to be regions; the test
  checks that each pane is a named region and that a pane folds from its header and comes back from the
  View menu.
- `tests/visual/baselines/`: all 32 re-recorded after looking at the diffs: every shot gains the pane
  headers, so the stage, library and timeline move down a little and the timeline is 240px high (was 200).
- `docs/PORT.md`, `docs/FEATURES.md` (G7), `docs/ARCHITECTURE.md`, `tests/visual/README.md`: updated.

**Decide which open features to build and which to drop** (branch `claude/project-thread-3drc3w`, PR #147).
Jonathan asked to go through the docs and settle the remaining features. He agreed to the proposal: finish
the port now that every strata-react issue it waited on is closed, then build four kept features, and drop
the rest.
- `docs/FEATURES.md`: new **Planned** and **Dropped** statuses. Planned: library drag onto a lane, H5 speed
  control, H7 brightness/contrast/saturation, B6b track reordering, a manual export check. Dropped, each with
  its reason: B5b, B7b, B8b (a strata-react `Timeline` concern), C5, G7's phone layout (panes stay, via
  `Workspace`), M9, J6 (no code ever did it), L1 to L5.
- `src/types.ts`, `src/components/MetadataPanel.tsx`, `src/components/TimelinePanel.tsx`: the `html` clip
  type is removed; nothing rendered it.
- `package.json`, `package-lock.json`: `recharts` removed (Jonathan's yes); nothing imported it since #138.
- `docs/PORT.md`: on 1.0.20; the strata-react table is now "closed, to swap here"; "After the port" lists
  the planned features. `docs/ARCHITECTURE.md`, `README.md`: recharts and HTML clips gone; gaps rewritten
  as planned and dropped.

**Update all dependencies** (branch `claude/project-thread-6a5jli`, PR #146).
Jonathan asked for every dependency to be updated. Only two were behind their ranges' latest: strata-react
and Playwright. The rest of the lockfile was refreshed to the newest versions the ranges allow.
- `package.json`, `package-lock.json`: strata-react 1.0.11 to 1.0.20; Playwright 1.63.0 to 1.65.0, still
  pinned exactly, as strata-visual needs. `npm update` refreshed transitive versions. No dependency was
  added or removed.
- `tests/visual/baselines/`: re-recorded after looking at each diff. strata-react's dialog scrim now darkens
  the page in the dark scheme instead of washing it pale (`export-settings`, `exported`, `remove-used-file`),
  and a slider's reset button sits on the slider's row (`inspector-edits`); the rest moved within tolerance.
  Playwright 1.65 wants Chromium 158, which this cloud container cannot download, so the baselines were
  recorded in Chromium 153 (`.strata-visual.json` says so); CI's visual job runs 158.
- Unit (431 passed, 1 skipped), integration (82) and the build pass on the new versions.

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
