# Changelog

What changed in Strata Vid and why. Every change adds an entry here in the same PR.

Group entries by day under `## YYYY-MM-DD`, newest day first. Each entry: a bold one-line title naming
the work and its branch (and PR number once known), one or two sentences on what was asked and what
changed the plan, then bullets naming each file or folder touched and what changed. Say **new** for new
files and call out corrections to earlier claims. Plain prose. Do not rewrite older entries except to fix
a factual error. Work before 2026-11-12 is in the git history only.

## 2026-11-12

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
