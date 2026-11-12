# Strata Vid architecture

How the editor is built, as of the move onto strata-react (2026-11). What it does is in the
[README](../README.md); where the UI port stands is in [PORT.md](PORT.md).

## Principles

- **Browser only.** Files are read as `File` objects and blob URLs; decoding, compositing and
  encoding happen on the device (WebCodecs through mediabunny). There is no server.
- **One store is the project.** A Zustand store (with Immer) holds the edit decision list: settings,
  assets, tracks, clips, playback and UI state. Every change goes through a store action, which is
  what makes undo, auto-save and export see the same project.
- **Two renderers, one model.** Preview is DOM (real `<video>` elements and positioned overlays) so it
  plays in real time; export is canvas, frame by frame, in a worker. Both read the same clips and
  properties, so a property means the same thing in both; they are separate code, so they can drift.
- **UI from strata-react.** Controls, overlays, menus, commands, toasts, theme roles and density
  come from strata-react; the app keeps only what the framework does not offer yet (see
  [PORT.md](PORT.md)).

## Stack

| Concern | Choice | Notes |
|---|---|---|
| UI | React 19, TypeScript 7 | `npm run build` runs `tsc` then Vite 8 |
| Components and styles | strata-react, Tailwind v4 | Theme roles only; `src/theme.generated.css` and `src/theme.css` are the app's palette and status roles. React Router and TanStack Query are present as strata-react's required peers; there is one screen and no remote data yet |
| State | Zustand 5 + Immer | Slices in `src/store/slices/`, undo in `src/store/middleware/historyMiddleware.ts` |
| Media | mediabunny | Metadata, thumbnails and decoding on load; encoding on export |
| Maps | Leaflet + react-leaflet | Preview map; export draws OSM tiles itself onto the canvas |
| GPX | `@we-gold/gpxjs` | Parsed to points, stats and GeoJSON in `AssetLoader`; simplified by `settings.simplificationTolerance` |
| Icons | lucide-react | |
| Charts | strata-react `LineChart` | The elevation profile |
| Tests | Jest 30 + Testing Library, jsdom | Babel transform (no ts-jest); `@napi-rs/canvas` for canvas code; see [AGENTS.md](../AGENTS.md) |

## Data model

The types are in `src/types.ts`; the store's full shape is in `src/store/types.ts`.

```
settings      width, height, fps, duration, previewQuality, snapToGrid, allowOverlaps,
              simplificationTolerance
assets        Record<id, Asset>     video | gpx | image | audio; blob URL, File, duration,
                                    resolution, videoMetadata, creationTime, thumbnail, waveform;
                                    GPX: gpxPoints, stats, geoJson
tracks        Record<id, Track>     video | audio | overlay; label, isMuted, isLocked, volume,
                                    clips (ordered ids), viewMode (frames | waveform | both)
trackOrder    string[]
clips         Record<id, Clip>      assetId, trackId, start, duration, offset (trim into the source),
                                    type (video | audio | image | map | text | data),
                                    properties, textStyle, content, syncOffset, extraTrackAssets,
                                    transitionIn, playbackRate, keyframes, volume
playback      currentTime, isPlaying, playbackRate
selection     selectedAssetId, selectedClipId
ui            loading, zoomLevel
```

`Clip.properties` (`OverlayProperties`) places a layer as percentages of the frame (x, y, width,
height), with rotation, opacity, zIndex and a CSS filter, plus map options (style, zoom, track and
marker style, heatmap, elevation profile) and data-overlay options (which readings, which units).
`keyframes` animates any numeric property by name, interpolated in `src/utils/animationUtils.ts`.

## GPX synchronisation

A map or data clip turns timeline time into a GPX timestamp:

```
gpxTime (epoch ms) = (clip.syncOffset ?? first GPX point's time) + (t − clip.start) × 1000
```

So `syncOffset` is the **absolute** GPX time at the clip's start, in epoch milliseconds (the comment on
`Clip.syncOffset` in `types.ts` calls it an offset; the code uses it as a time). Auto-sync
(`MapSyncControl`) sets it from a reference video's creation time plus that clip's trim offset; the
manual field takes the number directly. `getGpxPositionAtTime` (`src/utils/mapUtils.ts`) binary-searches
the points and interpolates between the two around that time. Extra tracks on one map clip each carry
their own `syncOffset`.

## Rendering

**Preview** (`src/components/PreviewPanel.tsx`, `src/components/preview/`), inside strata-react's
`MediaStage` with `StageGuides`; `TransportControls` is strata-react's transport. `usePlaybackLoop` advances
`currentTime` on `requestAnimationFrame`. The clips under the playhead are drawn bottom to top by
`OverlayRenderer`: `VideoPlayer` keeps a `<video>` seeked to `t − start + offset`, images and text are
positioned elements, map clips are `MapPanel` (Leaflet) with `HeatmapOverlay` and `ElevationProfile`,
data clips are `DataOverlay`. `AudioPlayer` and `AudioEngine` route each media element through a clip
gain, a track gain and a master gain (Web Audio), so mute and volume are heard in preview.

**Timeline** (`src/components/TimelinePanel.tsx`). strata-react's `Timeline` draws lanes, clips, the
ruler, playhead and markers and reports every move, trim, selection and seek; the panel applies them to
the store, so the store's rules (overlaps, locked tracks, how far a trim may go back into the source)
live in one place and nothing keeps a second copy of the clips. A refused move shows its reason while
dragging.

**Export** (`src/services/ExportManager.ts` → `src/workers/exportWorker.ts`). The manager starts a
worker and relays progress and cancel. In the worker, `WorkerCompositor` draws each frame on an
`OffscreenCanvas`: video frames decoded with mediabunny's `CanvasSink`, images, text, transitions,
keyframed properties, and maps drawn from OSM tiles with the track and marker. `AudioCompositor` mixes
the audio clips into one buffer. mediabunny's `Output` encodes MP4 or WebM into a buffer, which comes
back as a Blob to download.

`src/services/Compositor.ts` is an older main-thread compositor. Only its unit tests use it; the app
exports through the worker.

## Saving

- **Undo/redo**: strata-react's `useHistory` holds the steps (`src/hooks/useDocumentHistory.ts`). The
  store's `historyMiddleware` reports each change to the document (assets, tracks, clips, track order,
  settings, markers; never playback or selection) as a before/after pair; `src/utils/historyLabels.ts`
  names it from what changed ("move clip", "change opacity") and keys continuous controls so a slider
  drag is one step; undo and redo put a side back with `restoreDocument`, keeping the playhead and each
  file's current thumbnail. Opening or starting a project clears the history. 50 steps.
- **File**: `projectSerializer` writes a versioned JSON (`.svp`) without the files themselves; assets
  are listed by name and metadata, so an opened project shows each file as missing until it is
  relinked from the library.
- **Auto-save**: `useAutoSave` (on strata-react's) writes the same JSON to `localStorage`
  (`strata_vid_autosave`) 1.5 s after the document stops changing, shows `SaveStatus` in the header, asks
  before the tab closes while a change is unsaved, and restores the save on load when the editor is empty.
  An empty project removes the save. The visual tests fix the shown time (`settleSave` in `tests/visual/flows.ts`).

## Code layout

```
src/
  App.tsx, main.tsx       the one screen, a strata-react Workspace of four panes; providers (ThemeProvider, StrataQueryProvider, router, toasts)
  theme.css, theme.generated.css, index.css
  components/             panels (Library, Preview, Metadata, Timeline, Map), menus (Project, Edit),
                          dialogs (Export, Help), MapSyncControl, KeyframeList, TransportControls
    preview/              VideoPlayer, AudioPlayer, OverlayRenderer, MapPanel parts, DataOverlay,
                          HeatmapOverlay, ElevationProfile (a LineChart)
    timeline/             TrackHeader (each lane's header slot), WaveformOverlay; the timeline itself is
                          strata-react's Timeline, driven by TimelinePanel
  hooks/                  usePlaybackLoop, useKeyboardShortcuts (`useEditorCommands`, the command list), useAutoSave, useDebounce
  services/               AssetLoader, AudioEngine, AudioCompositor, ExportManager, WorkerCompositor, Compositor
  store/                  useProjectStore, slices/, middleware/historyMiddleware
  utils/                  gpxParser, mapUtils, timelineUtils, timeUtils, animationUtils, audioUtils,
                          projectSerializer, layoutUtils, textUtils, errorHandler, concurrency, workerUtils
  workers/exportWorker.ts
tests/unit/ tests/integration/ tests/utils/ tests/fixtures/
```

## Performance

Only active clips are rendered; GPX tracks are simplified on load; assets load lazily (thumbnails after
the asset appears); asset loading is limited by `src/utils/concurrency.ts`; export runs in a worker. Blob URLs are revoked when an asset is removed.
