# Feature register

Every feature the old roadmap planned (sections A–M), with what is true of it now. The IDs are the
old task numbers, so commits and PRs that name them (for example "Section H, H4") can still be traced;
the full task lists, with their acceptance criteria and hour estimates, are in git history at
`2de728f:docs/complete/` and `2de728f:docs/sections/`.

Status was checked against the code on 2026-11-12, after PR #138; where that differs from the old
section file, the note says so. **Done** works in the app. **Partial** exists in part (the note says
which part). **Not started** has no code. **Planned** and **Dropped** are Jonathan's decisions of
2026-11-12 on what to build after the port and what not to build; a dropped row stays so its ID can
still be traced, with the reason. Update a row in the same PR that changes it, and add new
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
| B5b | Ripple move (a move pushes neighbours along) | Dropped | "Add to timeline" places footage end to end, and ripple delete (H3) plus snapping cover the rest |
| B6 | Multiple tracks; add and delete; move clips between them | Done | |
| B6b | Reorder tracks | Planned | Track order decides what draws on top (a route inset over footage) |
| B7 | Select a clip; context menu; Delete key | Done | |
| B7b | Multi-select (Shift/Ctrl-click) | Dropped | A run edit has a handful of clips; the store keeps one `selectedClipId` |
| B8 | Zoom, scroll, zoom to fit | Done | `TimelineZoomControls` |
| B8b | Zoom anchored to the pointer | Dropped here | Zoom belongs to strata-react's `Timeline`; raise it there if wanted |
| — | Drag a file from the library onto a lane | Done | Back on 2026-11-12 through strata-react #121's drops from outside; refused with a reason over a locked track or the wrong kind of track. Pointer only; the keyboard uses "Add to timeline" |

## C. Preview rendering

| ID | Feature | Status | Notes |
|---|---|---|---|
| C1 | Layers composed bottom to top | Done | |
| C2–C4 | Video, image and text clips with position, size, rotation, opacity | Done | |
| C5 | HTML clips | Dropped | Sanitising needs a new dependency, the export worker cannot draw HTML, and text clips and the data overlay cover the uses. The `html` clip type was removed on 2026-11-12 |
| C6 | Preview quality setting | Done | |
| C7 | Safe-area guides | Done | strata-react `StageGuides` since #138 |

## D. Map and GPX

| ID | Feature | Status | Notes |
|---|---|---|---|
| D1 | Position at a time (binary search, interpolation) | Done | `getGpxPositionAtTime` |
| D2 | Map clip with track and moving marker | Done | Leaflet; moves to strata-react `RouteMap` once #161 lands. Preview fits the route and ignores the clip's zoom, which export uses |
| D3 | Manual sync | Done | `MapSyncControl`; the number is an absolute GPX time in epoch ms |
| D4 | Auto-sync from the video's creation time | Done | |
| D5 | Map styles, track and marker styling | Done | |

## E. Export

| ID | Feature | Status | Notes |
|---|---|---|---|
| E1–E3 | WebCodecs export of video, image and text layers | Done | In a worker (J3). Until 2026-11-12 an export never got past "Starting the export engine." (issue #141); fixed, and the `exported` visual state runs one to the end |
| E4 | Maps in export (tiles, route, marker) | Done | OSM tiles drawn by `WorkerCompositor` |
| E5 | Progress and cancel | Done | strata-react `JobStatus` |
| E6 | Settings (resolution, fps, format, quality) | Done | MP4 or WebM |
| E7–E8 | Download; error handling | Done | |
| — | Checked by hand in a browser | Planned | Once the port is done; tests and the `exported` visual state cover the pipeline |

## F. Project

| ID | Feature | Status | Notes |
|---|---|---|---|
| F1–F3 | Save and open a `.svp` file | Done | Files are not stored in it; an opened project relinks them |
| F4 | Undo and redo | Done | strata-react `useHistory` since 2026-11-12: named steps, a slider drag is one step, Undo disabled when there is nothing to undo; 50 steps |
| F5 | Auto-save to `localStorage` | Done | 1.5 s after a change (was every 60 s), with `SaveStatus` in the header and a reason when it fails; restored when the editor opens empty |
| F6 | New project | Done | |

## G. User experience

| ID | Feature | Status | Notes |
|---|---|---|---|
| G1–G2 | Loading states; error messages | Done | Toasts and per-file outcomes (strata-react) |
| G3 | Tooltips and a shortcuts reference | Done | |
| G4 | Asset thumbnails | Done | |
| G5 | Editable properties panel | Done | strata-react `Inspector` |
| G6 | Dark and light mode | Done | Was open in the old file; done by #137 (`ThemeProvider`, `ColorSchemeChoice`) |
| G7 | Layout for narrow screens | Dropped (phone); panes done | Editing and WebCodecs export on a phone is not a goal. Since 2026-11-12 the panels are strata-react `Workspace` panes (#68): they resize, fold, and stack below 720px |
| G8 | Accessibility | Done | Mostly through strata-react's controls since #137 |

## H. Advanced timeline

| ID | Feature | Status | Notes |
|---|---|---|---|
| H1–H3 | Split, duplicate, ripple delete | Done | Clip context menu |
| H4 | Crossfade transitions | Done | Preview and export |
| H5 | Speed (per-clip playback rate) | Done | 2026-11-12: "Speed" in a video clip's Timing section (0.25× to 8×; a slower speed that would run into the next clip is refused). The route on a map, its readings and the elevation profile follow the footage's speed (`routeClock.ts`). Sound at another speed changes pitch in preview as it does in export. Checked by unit tests, not yet by eye in a browser |
| H6 | Markers | Done | |
| H7 | Video filters | Done | 2026-11-12: brightness, contrast and saturation sliders in a video or image clip's Colour section, written as the clip's CSS `filter` that preview and export apply |
| H8 | Keyframe animation | Done | `KeyframeList`; the old file marked it partial |

## I/M. Audio

Section I was replaced by M; I's open items (waveforms, volume, export) were done under M.

| ID | Feature | Status | Notes |
|---|---|---|---|
| M1, I1 | Audio assets and data model | Done | |
| M2, I6 | Waveforms, including from a video's audio | Done | |
| M3–M5 | Web Audio graph: clip, track and master gain | Done | `AudioEngine` |
| M6 | Volume controls | Done | Track volume in the track settings popover since #138 |
| M7 | Waveforms on the timeline | Done | Lanes two rows high since 2026-11-12 (strata-react #121) |
| M8 | Audio in export | Done | Mixed on the main thread by `AudioCompositor` and encoded in the worker (issue #141). A browser that cannot encode the chosen codec gets another the container takes, and the finished export says so |
| M9 | Equaliser, compressor, reverb | Dropped | Out of scope for a run video |

## J. Performance

| ID | Feature | Status | Notes |
|---|---|---|---|
| J1 | Only visible clips drawn on the timeline | Done | Was the app's own; now up to strata-react's `Timeline` |
| J2 | Lazy asset loading | Done | Thumbnails after the asset appears; limited concurrency |
| J3 | Export in a Web Worker | Done | |
| J4 | Debounced expensive work | Done | `useDebounce` |
| J5 | Memory: blob URLs revoked, history capped | Done | |
| J6 | Frame dropping when playback lags | Dropped | Marked done in the old file, but no code does it; preview plays real `<video>` elements, which keep time themselves |

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

All dropped (2026-11-12). They need a server, and the app's premise is that nothing is uploaded. Sharing,
if ever wanted, would be a new section.

| ID | Feature | Status |
|---|---|---|
| L1 | Share a project by link | Dropped |
| L2 | Cloud storage for assets | Dropped |
| L3 | Real-time collaboration | Dropped |
| L4 | Comments on the timeline | Dropped |
| L5 | Version history | Dropped |
