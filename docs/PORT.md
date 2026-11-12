# Moving onto strata-react

Strata Vid's UI is moving onto [strata-react](https://github.com/jburnhams/strata-react). The order
is Jonathan's (2026-11-12): first make strata-react a good generic framework and move this app onto
it; only then fix this app's own problems. So while the port runs:

- A missing UI part is a **strata-react issue**, written as a generic component family with Strata Vid
  as one consumer, not a component built here.
- App bugs found on the way are noted here, and filed once the visual tests found more (below).
- When a strata-react release closes an issue below, the matching code here is swapped for it in a
  strata-vid PR, and this page and the [CHANGELOG](../CHANGELOG.md) are updated.

Status as of 2026-11-12. strata-vid depends on `strata-react ^1.0.20`, the latest on npm. Every
strata-react issue below is closed, so the rest of the port is swaps in this app (branch
`claude/project-thread-3drc3w`).

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
moved into a per-track settings popover, and the time readout shows milliseconds (#122). `recharts`
was removed from `package.json` on 2026-11-12 (Jonathan's yes).

## Swapped on 2026-11-12

- [#68](https://github.com/jburnhams/strata-react/issues/68) Workspace layout: the editor's four panels are
  `Pane`s in a `Workspace` (library, preview, inspector, timeline); each resizes, the side panes and the
  timeline fold, sizes are remembered, and a View menu shows or hides them.

## Closed in strata-react, to swap here

| Issue | What it is for |
|---|---|
| [#80](https://github.com/jburnhams/strata-react/issues/80) Map | Themed map with routes, a moving position and overlays (replaces the Leaflet panel in preview) |
| [#81](https://github.com/jburnhams/strata-react/issues/81) Document history and save state | Undo/redo and "Saved" (replaces `historyMiddleware` wiring and auto-save notices) |
| [#116](https://github.com/jburnhams/strata-react/issues/116) Fixes from the port | Controlled dialog warning, inspector overflow, colour picker names, Jest setup docs |
| [#117](https://github.com/jburnhams/strata-react/issues/117) Density | One density setting reaching overlays; small sizes across controls |
| [#121](https://github.com/jburnhams/strata-react/issues/121) Timeline for editors | Drops from outside, lane height, kind colours, header width |
| [#122](https://github.com/jburnhams/strata-react/issues/122) Media and files in narrow panes | MissingFile layout, LineChart x label, frame timecode |

## App bugs noted

Found while writing the visual tests (2026-11-12), with the media in `tests/fixtures/media`, and filed
as issues #141 to #145. All fixed on 2026-11-12 (branch `claude/project-thread-6a5jli`):

- #141: export never rendered a frame, and always dropped the sound.
- #142: MP4 details and dates, and GPX dates, were not read.
- #143: the library listed files in a race order; "Add to timeline" selected the file and stacked
  everything on the video track; rows were buttons holding buttons; an audio file showed the map icon.
- #144: the sync panel's unlabelled epoch field and mixed date styles; the elevation profile marked a
  different place from the map, on an axis from 0 m.
- #145: the empty stage's "0.00s"; the waveform invisible in light.

Left for strata-react: the profile still labels the route's end "now", which LineChart always does
(passed on as a framework gap), and clip kind colours that swap between schemes (#121).

## After the port

Jonathan decided on 2026-11-12 which open features to build and which to drop; FEATURES.md marks them
**Planned** or **Dropped**. Planned: clip speed (H5), brightness, contrast and saturation (H7), reordering
tracks (B6b), and checking an export by hand in Chrome.

## Testing notes

Jest needs `transformIgnorePatterns` that let Babel transform ESM-only packages (strata-react, React
Router, TanStack, and others), plus a Babel plugin that replaces `import.meta`; both are in `jest.base.config.js`, the
plugin in `tests/utils/babelImportMeta.cjs`. Integration tests query by role and name, as strata-react's controls expect.
