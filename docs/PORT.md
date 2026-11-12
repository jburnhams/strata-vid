# Moving onto strata-react

Strata Vid's UI is moving onto [strata-react](https://github.com/jburnhams/strata-react). The order
is Jonathan's (2026-11-12): first make strata-react a good generic framework and move this app onto
it; only then fix this app's own problems. So while the port runs:

- A missing UI part is a **strata-react issue**, written as a generic component family with Strata Vid
  as one consumer, not a component built here.
- App bugs found on the way are noted, not fixed (one known: an audio asset shows the map icon in the
  library).
- When a strata-react release closes an issue below, the matching code here is swapped for it in a
  strata-vid PR, and this page and the [CHANGELOG](../CHANGELOG.md) are updated.

Status as of 2026-11-12. strata-vid depends on `strata-react ^1.0.11`; the latest on npm is 1.0.12.

## Done (in use)

From PR [#137](https://github.com/jburnhams/strata-vid/pull/137): theme roles and the app's own palette,
`ThemeProvider` (dark by default), toolbars, toggles and sliders (#69), `Dialog` and `AlertDialog` (#70),
menus, context menus, the command menu and chorded shortcuts from one command list (#71), toasts and
`JobStatus` for export (#72), `NumberField` and `Slider` with units (#73), `Inspector` and `PropertyList`
in the metadata panel (#74).

From PR [#138](https://github.com/jburnhams/strata-vid/pull/138), on 1.0.11: file intake in the library
(`FileButton`, `FileDropZone`, `FileOutcomes`, `MissingFile`; #75), the `Timeline` (#77), the transport
and stage (`Transport`, `TimeReadout`, `SeekBar`, `VolumeControl`, `RateChoice`, `MediaStage`,
`StageGuides`; #78) and the elevation profile as a `LineChart` (#79). `@dnd-kit` is removed (#76):
strata-react's Timeline takes no drops from outside yet, so files go on with "Add to timeline"
(Jonathan's call; strata-react #121). With it, a clip move that would overlap or touch a locked track
is refused with a reason instead of landing at the nearest free spot, track volume and "Clips show"
moved into a per-track settings popover, and the time readout shows milliseconds (#122). `recharts` is
no longer imported; removing it from `package.json` is Jonathan's call.

## Waiting on strata-react

| Issue | What it is for |
|---|---|
| [#68](https://github.com/jburnhams/strata-react/issues/68) Workspace layout | Docked, resizable, collapsible panes for the editor's four panels |
| [#80](https://github.com/jburnhams/strata-react/issues/80) Map | Themed map with routes, a moving position and overlays (replaces the Leaflet panel in preview) |
| [#81](https://github.com/jburnhams/strata-react/issues/81) Document history and save state | Undo/redo and "Saved" (replaces `historyMiddleware` wiring and auto-save notices) |
| [#116](https://github.com/jburnhams/strata-react/issues/116) Fixes from the port | Controlled dialog warning, inspector overflow, colour picker names, Jest setup docs |
| [#117](https://github.com/jburnhams/strata-react/issues/117) Density | One density setting reaching overlays; small sizes across controls |
| [#121](https://github.com/jburnhams/strata-react/issues/121) Timeline for editors | Drops from outside, lane height, kind colours, header width |
| [#122](https://github.com/jburnhams/strata-react/issues/122) Media and files in narrow panes | MissingFile layout, LineChart x label, frame timecode |

## App bugs noted

Found while writing the visual tests (2026-11-12), with the media in `tests/fixtures/media`. Noted, not
fixed, per the order above.

- **Export never starts rendering.** With one 8 s clip on the timeline, MP4 or WebM, the dialog stays at
  "Starting the export engine." for minutes and reports no failure; the worker sends no progress after
  its first message. Seen in Playwright's Chromium, which encodes H.264 and VP9 (checked with
  `VideoEncoder.isConfigSupported`).
- **Export drops the sound every time.** The worker renders audio with `OfflineAudioContext`, which
  workers do not have ("OfflineAudioContext not supported", then "proceeding with video only").
- **MP4 metadata is mostly not read.** For a GoPro-style H.264/AAC MP4 that ffprobe reads in full, the
  inspector shows Container, Frame rate and Bitrate as "–" and takes the date from the file's modified
  time ("Date from: file") although the file has `creation_time`, so map sync starts from the wrong time.
- **A GPX file shows no Created date** although its points have times (the sync panel shows the GPX start).
- **Files added together are listed in a race order**: the library lists them as they finish loading.
- **"Add to timeline" also selects the file** (the click reaches the row), and it puts audio and GPX on
  the video track, end to end after the clips.
- **Library rows are buttons containing buttons**: a row's accessible name includes its "Add … to
  timeline" and "Remove …" buttons, so each of those names matches two elements.
- **Sync panel**: the sync offset input has no label (only a placeholder, "Epoch ms at Video 0s"), and its
  dates are written `03/05/2026, 07:41:08` where the inspector writes `3 May 2026, 07:43`.
- **Elevation profile disagrees with itself**: with the playhead on the route clip it marks 2.6 km (373 m)
  with a line and labels the route's end "216 m now", while the map's marker is at the start. Its height
  axis runs from 0 m for a route between 215 m and 429 m.
- **The empty stage shows "0.00s"** in monospace in its middle.
- **In the light scheme the audio clip's waveform is invisible** (it shows in dark).

## After the port

The app's own work starts once the table above is empty: the open rows in
[FEATURES.md](FEATURES.md), the bugs above, and anything the port turned up.

## Testing notes

Jest needs `transformIgnorePatterns` that let Babel transform ESM-only packages (strata-react, React
Router, TanStack, and others), plus a Babel plugin that replaces `import.meta`; both are in `jest.base.config.js`, the
plugin in `tests/utils/babelImportMeta.cjs`. Integration tests query by role and name, as strata-react's controls expect.
