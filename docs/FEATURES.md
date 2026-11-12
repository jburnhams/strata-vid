# Feature register

Every feature the old roadmap planned (sections A–M), with what is true of it now. The IDs are the
old task numbers, so commits and PRs that name them (for example "Section H, H4") can still be traced;
the full task lists, with their acceptance criteria and hour estimates, are in git history at
`2de728f:docs/complete/` and `2de728f:docs/sections/`.

Status was checked against the code on 2026-11-12, after PR #138; where that differs from the old
section file, the note says so. **Done** works in the app. **Partial** exists in part (the note says
which part). **Not started** has no code. Update a row in the same PR that changes it, and add new
features as rows (new IDs continue the letter, or start N).

## A. Playback

| ID | Feature | Status | Notes |
|---|---|---|---|
| A2 | Transport controls (play, pause, stop) | Done | strata-react `Transport` since #138 |
| A3 | Video playback in preview | Done | |
| A4–A5 | Playhead on the timeline, synced with preview | Done | strata-react `Timeline` |
| A6 | Keyboard shortcuts | Done | One command list (`useEditorCommands`) drives keys, menus and the shortcuts dialog |

## B. Timeline editing

| ID | Feature | Status | Notes |
|---|---|---|---|
| B1–B3 | Clips drawn on tracks; move; trim from either end | Done | Pointer and keyboard since #138 |
| B4 | Snapping (clip edges, playhead) | Done | Toggle in the timeline toolbar |
| B5 | Collision rules | Done | A move that would overlap is refused with a reason; "Allow overlaps" lifts it |
| B5b | Ripple move (a move pushes neighbours along) | Not started | Only ripple **delete** exists (H3) |
| B6 | Multiple tracks; add and delete; move clips between them | Done | |
| B6b | Reorder tracks | Not started | |
| B7 | Select a clip; context menu; Delete key | Done | |
| B7b | Multi-select (Shift/Ctrl-click) | Not started | Store holds one `selectedClipId` |
| B8 | Zoom, scroll, zoom to fit | Done | `TimelineZoomControls` |
| B8b | Zoom anchored to the pointer | Not started | |
| — | Drag a file from the library onto a lane | Not started | Removed with `@dnd-kit` in #138; waits on strata-react #121. "Add to timeline" instead |

## C. Preview rendering

| ID | Feature | Status | Notes |
|---|---|---|---|
| C1 | Layers composed bottom to top | Done | |
| C2–C4 | Video, image and text clips with position, size, rotation, opacity | Done | |
| C5 | HTML clips | Not started | The clip type exists and the timeline labels it; nothing renders it. The old plan required sanitising (DOMPurify or similar), which would be a new dependency |
| C6 | Preview quality setting | Done | |
| C7 | Safe-area guides | Done | strata-react `StageGuides` since #138 |

## D. Map and GPX

| ID | Feature | Status | Notes |
|---|---|---|---|
| D1 | Position at a time (binary search, interpolation) | Done | `getGpxPositionAtTime` |
| D2 | Map clip with track and moving marker | Done | Leaflet; to move to strata-react #80 |
| D3 | Manual sync | Done | `MapSyncControl`; the number is an absolute GPX time in epoch ms |
| D4 | Auto-sync from the video's creation time | Done | |
| D5 | Map styles, track and marker styling | Done | |

## E. Export

| ID | Feature | Status | Notes |
|---|---|---|---|
| E1–E3 | WebCodecs export of video, image and text layers | Partial | In a worker (J3). The code is there, but on 2026-11-12 an export in Playwright's Chromium never got past "Starting the export engine." ([PORT.md](PORT.md#app-bugs-noted)); not retried in Chrome |
| E4 | Maps in export (tiles, route, marker) | Done | OSM tiles drawn by `WorkerCompositor` |
| E5 | Progress and cancel | Done | strata-react `JobStatus` |
| E6 | Settings (resolution, fps, format, quality) | Done | MP4 or WebM |
| E7–E8 | Download; error handling | Done | |
| — | Checked by hand in a browser | Not done | The old file left "manual verify in browser" open; tests cover the pipeline |

## F. Project

| ID | Feature | Status | Notes |
|---|---|---|---|
| F1–F3 | Save and open a `.svp` file | Done | Files are not stored in it; an opened project relinks them |
| F4 | Undo and redo | Done | 50 steps; the UI part waits on strata-react #81 |
| F5 | Auto-save to `localStorage` | Done | Every 60 s; restored when the editor opens empty |
| F6 | New project | Done | |

## G. User experience

| ID | Feature | Status | Notes |
|---|---|---|---|
| G1–G2 | Loading states; error messages | Done | Toasts and per-file outcomes (strata-react) |
| G3 | Tooltips and a shortcuts reference | Done | |
| G4 | Asset thumbnails | Done | |
| G5 | Editable properties panel | Done | strata-react `Inspector` |
| G6 | Dark and light mode | Done | Was open in the old file; done by #137 (`ThemeProvider`, `ColorSchemeChoice`) |
| G7 | Layout for narrow screens | Not started | Workspace panes wait on strata-react #68 |
| G8 | Accessibility | Done | Mostly through strata-react's controls since #137 |

## H. Advanced timeline

| ID | Feature | Status | Notes |
|---|---|---|---|
| H1–H3 | Split, duplicate, ripple delete | Done | Clip context menu |
| H4 | Crossfade transitions | Done | Preview and export |
| H5 | Speed (per-clip playback rate) | Partial | Store action `updateClipPlaybackRate` and rendering exist; no control calls it. The old file said done |
| H6 | Markers | Done | |
| H7 | Video filters | Partial | `properties.filter` is applied in preview and export; no control sets it. The old file said done |
| H8 | Keyframe animation | Done | `KeyframeList`; the old file marked it partial |

## I/M. Audio

Section I was replaced by M; I's open items (waveforms, volume, export) were done under M.

| ID | Feature | Status | Notes |
|---|---|---|---|
| M1, I1 | Audio assets and data model | Done | |
| M2, I6 | Waveforms, including from a video's audio | Done | |
| M3–M5 | Web Audio graph: clip, track and master gain | Done | `AudioEngine` |
| M6 | Volume controls | Done | Track volume in the track settings popover since #138 |
| M7 | Waveforms on the timeline | Done | Shown as a strip until strata-react #121 (lane height) |
| M8 | Audio in export | Partial | `AudioCompositor` renders with `OfflineAudioContext`, which the export worker does not have, so exports have no sound ([PORT.md](PORT.md#app-bugs-noted)) |
| M9 | Equaliser, compressor, reverb | Not started | Marked "future" |

## J. Performance

| ID | Feature | Status | Notes |
|---|---|---|---|
| J1 | Only visible clips drawn on the timeline | Done | Was the app's own; now up to strata-react's `Timeline` |
| J2 | Lazy asset loading | Done | Thumbnails after the asset appears; limited concurrency |
| J3 | Export in a Web Worker | Done | |
| J4 | Debounced expensive work | Done | `useDebounce` |
| J5 | Memory: blob URLs revoked, history capped | Done | |
| J6 | Frame dropping when playback lags | Unverified | Marked done in the old file; no code found that names it |

## K. Advanced map

| ID | Feature | Status | Notes |
|---|---|---|---|
| K1 | Several GPX tracks on one map | Done | `extraTrackAssets` |
| K2 | Elevation profile | Done | strata-react `LineChart` since #138 |
| K3 | Data overlay (speed, distance, elevation) | Done | |
| K4 | Custom map styles | Done | |
| K5 | Track simplification | Done | |
| K6 | Speed or elevation heatmap | Done | |

## L. Sharing and cloud

None started. All need a server, which the app does not have; whether they are still wanted is open.

| ID | Feature | Status |
|---|---|---|
| L1 | Share a project by link | Not started |
| L2 | Cloud storage for assets | Not started |
| L3 | Real-time collaboration | Not started |
| L4 | Comments on the timeline | Not started |
| L5 | Version history | Not started |
