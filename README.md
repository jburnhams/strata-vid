# Strata Vid

A video editor that runs in the browser and stitches run footage to a GPX track: clips on a
timeline, a map and data overlays that follow the runner's position, and export to MP4. Nothing is
uploaded; files are read and encoded on the device.

## Status

The editor works end to end: load videos, GPX, images and audio; arrange them on tracks; preview
with synchronised map, elevation and speed overlays; save and reload a project; export an MP4 with
audio. What it does is listed below; how it does it is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

The current work is **moving the UI onto [strata-react](https://github.com/jburnhams/strata-react)**,
Jonathan's React + Tailwind framework. Fixing the app's own problems waits until that is done. Where the
port stands and what it is waiting on: [docs/PORT.md](docs/PORT.md). What changed and why:
[CHANGELOG.md](CHANGELOG.md).

## What it does

- **Library**: pick or drop video, GPX, image and audio files; each file's outcome (adding, added, or
  failed with its reason and Try again) shows beside it. Each one gets a thumbnail (first frame for
  video), metadata (codec, frame rate, creation time) and, for audio, a waveform. A missing file is
  relinked in place. Removing an asset in use asks first.
- **Timeline** (strata-react's `Timeline`): tracks for video, audio and overlays; files go on with
  "Add to timeline"; move, trim and change lane with the pointer or the keyboard, snapping on or off;
  a move that would overlap another clip or touch a locked track is refused with its reason; zoom,
  mute and lock, per-track volume and view in a settings popover, markers, crossfade transitions,
  split, duplicate, ripple delete, and keyframes for a clip's properties.
- **Preview**: the clips under the playhead composed live: video, images, text, a Leaflet map of the
  GPX track with a moving marker (several tracks, a speed or elevation heatmap, an elevation profile),
  and a data overlay (speed, distance, elevation in chosen units). Transport, seek bar, volume and
  speed below; stage guides and a preview quality setting.
- **GPX sync**: a map clip's offset is set from the video's creation time or by hand.
- **Audio**: per-clip and per-track volume through Web Audio, mixed into the export.
- **Project**: undo and redo of named steps ("Undo trim clip", 50 kept), save to and open from a `.svp`
  file, auto-save to `localStorage` a moment after each change, with "Saved" and the time in the header.
- **Export**: MP4 or WebM, rendered frame by frame in a Web Worker with WebCodecs (via mediabunny),
  with progress and cancel.
- **Commands**: every action has a shortcut and appears in the command menu and the Edit menu; the
  shortcuts dialog (the keyboard button) lists them.

Every planned feature, done or not, is in [docs/FEATURES.md](docs/FEATURES.md) under its old roadmap
ID, marked **Planned** or **Dropped** where Jonathan decided (2026-11-12). Planned: dragging library files
onto the timeline (back with the port), a speed control and brightness, contrast and saturation sliders
(both already render), reordering tracks, and checking an export by hand in Chrome. Dropped: HTML clips,
ripple move, multi-select, a phone layout, audio effects, and sharing or cloud storage.

## Running it

Needs Node 26 (`.nvmrc`; strata-react requires it) and a Chromium browser (Chrome, Edge, Brave):
export uses WebCodecs and `OffscreenCanvas`. The old docs said Firefox previews but cannot export and Safari does not work; neither has been retested since.

```bash
npm install
npm run dev            # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | type-check, then a production build in `dist/` |
| `npm run preview` | serve the production build |
| `npm test` / `npm run test:unit` | unit tests (Jest, jsdom, mocks) |
| `npm run test:coverage` | unit tests with coverage; coverage comes from this suite only |
| `npm run test:integration` | integration tests (Jest, jsdom, real store and components, fixtures in `tests/fixtures/`) |
| `npm run test:visual` | visual tests: the editor's states screenshotted light and dark against `tests/visual/baselines` (after `npm run build`; see [tests/visual/README.md](tests/visual/README.md)) |
| `npm run type-check` | `tsc --noEmit` |

`?strict=false` on the URL turns React's StrictMode off, for checking double-run effects. In
development the store is on `window.useProjectStore`.

## Stack

React 19, TypeScript 7, Vite 8 and Tailwind v4, with **strata-react** for components (including the
timeline, transport, file intake and charts), theme roles, commands, overlays and toasts (plus its required peers React Router and TanStack Query). Zustand with
Immer holds the project. mediabunny does decoding and encoding, Leaflet and react-leaflet draw maps,
`@we-gold/gpxjs` parses GPX, lucide-react supplies icons. Details and reasons: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

The theme is the app's own: `src/theme.generated.css` (strata-react's palette script, seeded from
Ordnance Survey contour orange) and `src/theme.css` (status roles and faces, each with its reason).

## For contributors and agents

- Test layout and CI rules: [AGENTS.md](AGENTS.md). Unit tests in `tests/unit/`, integration in
  `tests/integration/`, shared setup in `tests/utils/`.
- New UI uses strata-react's components and roles; where strata-react has no part yet, see
  [docs/PORT.md](docs/PORT.md) before building one here.
- Every change adds an entry to [CHANGELOG.md](CHANGELOG.md) in the same PR.
- Dependencies (adding, removing, replacing, pinning a major) are Jonathan's decision; ask first.

## License

MIT; see [LICENSE](LICENSE).
