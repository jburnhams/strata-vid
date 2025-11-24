# Section D: Map & GPX Integration ⭐⭐

**Priority**: High (Core feature, unique differentiator)
**Goal**: Display synchronized map with GPX track in preview and export.
**Dependencies**: Section A (playback), Section C (overlay rendering)
**Status**: ✅ Implemented

## Overview

This is what makes Strata Vid unique - synchronizing GPS data with video playback to show your exact location on a map as the video plays. Requires precise time-to-coordinate mapping and smooth map updates.

## Tasks

### D1: GPX coordinate lookup (3-4 hours)
**Files**: `src/utils/gpxParser.ts`, `src/utils/mapUtils.ts`

- [x] Implement efficient binary search in `gpxPoints` array:
  - Points sorted by timestamp
  - Binary search to find points surrounding given time
  - Return { before: GpxPoint, after: GpxPoint }
- [x] Linear interpolation between points:
  - `lat = lerp(before.lat, after.lat, t)`
  - `lon = lerp(before.lon, after.lon, t)`
  - Where `t = (time - before.time) / (after.time - before.time)`
- [x] Handle edge cases:
  - Time before GPX start → return first point
  - Time after GPX end → return last point
  - GPX with single point → return that point
- [x] Create utility: `getCoordinateAtTime(gpxPoints, time, syncOffset)`

**Acceptance**: Given any time, function returns accurate lat/lon, interpolated smoothly.

---

### D2: Map overlay component (5-7 hours)
**Files**: `src/components/preview/MapOverlay.tsx` (implemented in `MapPanel.tsx` and `OverlayRenderer.tsx`)

- [x] Create Leaflet map that updates center based on time:
  - Use react-leaflet: `<MapContainer>`, `<TileLayer>`, `<Polyline>`, `<Marker>`
  - Center: `getCoordinateAtTime(clip.gpxPoints, currentTime, clip.syncOffset)`
  - Update center in `useEffect` when `currentTime` changes
- [x] Render full GPX track as polyline:
  - Convert all gpxPoints to `[lat, lon][]`
  - Use `<Polyline positions={trackPoints} />`
  - Style: color, weight, opacity
- [x] Current position marker (moves with playback):
  - `<Marker position={currentPosition}>`
  - Use custom icon (arrow, dot, or runner icon)
  - Animate smoothly (CSS transitions)
- [x] Zoom level control:
  - Store in clip properties or auto-calculate from track bounds
  - Option to auto-zoom to show full track vs. follow mode (zoomed in)
- [x] Apply clip transform properties (position, size) to map container

**Acceptance**: Map displays with GPX track, marker moves with playback, smooth updates.

---

### D3: Manual sync interface (4-5 hours)
**Files**: `src/components/MapSyncControl.tsx`, `src/components/MetadataPanel.tsx`

- [x] UI to align video time with GPX time:
  - Implemented in Metadata Panel when Map clip is selected
  - Shows creation times and allows manual offset entry
- [x] Visual feedback showing alignment:
  - Shows Metadata times and current offset
- [x] Save offset to clip:
  - Updates `clip.syncOffset` in store
- [x] Reset option (use auto-sync or zero)

**Acceptance**: Can manually align video and GPX, offset persists, map plays in sync.

---

### D4: Auto-sync (creation time matching) (3-4 hours)
**Files**: `src/services/AssetLoader.ts`, `src/utils/gpxParser.ts`

- [x] Extract video creation date from metadata:
  - Uses `mediabunny` tags or file modification time
  - Fallback mechanism implemented
- [x] Match with GPX start time:
  - Implemented in `MapSyncControl`
- [x] Suggest offset to user:
  - "Auto-Sync to Video Metadata" button available in Metadata Panel
- [x] Handle missing metadata gracefully:
  - Button disabled if no metadata available

**Acceptance**: Auto-sync suggests reasonable offset, user can accept or override.

---

### D5: Map styling options (2-3 hours)
**Files**: `src/components/MapPanel.tsx`, `src/store/slices/timelineSlice.ts`

- [x] Choose tile provider:
  - OSM, Mapbox (Satellite/Demo)
- [x] Zoom level control:
  - Slider in Metadata Panel
- [x] Track line customization:
  - Color, Width, Opacity controls
- [x] Marker icon customization:
  - Color control

**Acceptance**: Map appearance customizable (tiles, track style, marker).

---

### D6: Test map rendering in preview (2-3 hours)
**Files**: Multiple

- [x] Verify map updates smoothly during playback:
  - Verified via integration tests (`tests/integration/MapPreview.test.tsx` confirms marker updates with time)
- [x] Check performance with long GPX tracks (1000+ points):
  - Binary search implemented for efficiency
- [x] Optimize tile loading/caching:
  - Using Leaflet's built-in mechanism
- [x] Test with multiple map clips (if supported)

**Acceptance**: Map renders smoothly, no performance issues with typical GPX files.

---

## Testing

### Manual Testing
- [x] GPX file loads, stats extracted correctly
- [x] Map displays with full track polyline
- [x] Marker moves with playback
- [x] Manual sync aligns video and GPS accurately
- [x] Auto-sync suggests reasonable offset
- [x] Map tiles load without blocking
- [x] Map styling options work

### Unit Tests
- `tests/unit/utils/gpxParser.test.ts` - ✅ Passed
- `tests/unit/components/MapPanel.test.tsx` - ✅ Passed
- `tests/unit/components/MapSyncControl.test.tsx` - ✅ Passed
- `tests/integration/MapSync.test.tsx` - ✅ Passed
- `tests/integration/MapPreview.test.tsx` - ✅ Passed

---

## Success Criteria

1. ✅ GPX track loads and displays on map
2. ✅ Map center follows current position during playback
3. ✅ Can manually sync video time to GPS time
4. ✅ Auto-sync suggests default offset
5. ✅ Map styling customizable
6. ✅ Smooth performance, no playback lag

**GPS-synchronized map overlay working - core feature complete!**

---

## Next Steps

- **Section E** (Export) - Ensure map renders correctly in exported video
- **Section K** (Advanced Map) - Elevation profiles, data overlays, heatmaps

See [docs/IMPLEMENTATION.md](../IMPLEMENTATION.md) for full roadmap.
