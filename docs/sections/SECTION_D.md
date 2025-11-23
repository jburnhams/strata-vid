# Section D: Map & GPX Integration ⭐⭐

**Priority**: High (Core feature, unique differentiator)
**Goal**: Display synchronized map with GPX track in preview and export.
**Dependencies**: Section A (playback), Section C (overlay rendering)
**Status**: 🟨 Partially implemented

## Overview

This is what makes Strata Vid unique - synchronizing GPS data with video playback to show your exact location on a map as the video plays. Requires precise time-to-coordinate mapping and smooth map updates.

## Tasks

### D1: GPX coordinate lookup (3-4 hours)
**Files**: `src/utils/gpxParser.ts`, `src/utils/mapUtils.ts`

- [ ] Implement efficient binary search in `gpxPoints` array:
  - Points sorted by timestamp
  - Binary search to find points surrounding given time
  - Return { before: GpxPoint, after: GpxPoint }
- [ ] Linear interpolation between points:
  - `lat = lerp(before.lat, after.lat, t)`
  - `lon = lerp(before.lon, after.lon, t)`
  - Where `t = (time - before.time) / (after.time - before.time)`
- [ ] Handle edge cases:
  - Time before GPX start → return first point
  - Time after GPX end → return last point
  - GPX with single point → return that point
- [ ] Create utility: `getCoordinateAtTime(gpxPoints, time, syncOffset)`

**Acceptance**: Given any time, function returns accurate lat/lon, interpolated smoothly.

---

### D2: Map overlay component (5-7 hours)
**Files**: `src/components/preview/MapOverlay.tsx` (new or refactor `MapPanel.tsx`)

- [ ] Create Leaflet map that updates center based on time:
  - Use react-leaflet: `<MapContainer>`, `<TileLayer>`, `<Polyline>`, `<Marker>`
  - Center: `getCoordinateAtTime(clip.gpxPoints, currentTime, clip.syncOffset)`
  - Update center in `useEffect` when `currentTime` changes
- [ ] Render full GPX track as polyline:
  - Convert all gpxPoints to `[lat, lon][]`
  - Use `<Polyline positions={trackPoints} />`
  - Style: color, weight, opacity
- [ ] Current position marker (moves with playback):
  - `<Marker position={currentPosition}>`
  - Use custom icon (arrow, dot, or runner icon)
  - Animate smoothly (CSS transitions)
- [ ] Zoom level control:
  - Store in clip properties or auto-calculate from track bounds
  - Option to auto-zoom to show full track vs. follow mode (zoomed in)
- [ ] Apply clip transform properties (position, size) to map container

**Acceptance**: Map displays with GPX track, marker moves with playback, smooth updates.

---

### D3: Manual sync interface (4-5 hours)
**Files**: `src/components/MapSyncControl.tsx`

- [ ] UI to align video time with GPX time:
  - Two-column layout: video frame on left, map on right
  - User scrubs video to find recognizable landmark
  - User clicks corresponding point on GPX track (or scrubs GPX time slider)
  - Calculate offset: `syncOffset = gpxPointTime - videoTime`
  - Store in `clip.syncOffset`
- [ ] Visual feedback showing alignment:
  - Show selected video time and selected GPS time
  - Show calculated offset (e.g., "+0:30" means GPX 30s ahead)
  - Live preview: scrub video, map updates using new offset
- [ ] Save offset to clip:
  - Button: "Apply Sync"
  - Updates `clip.syncOffset` in store
- [ ] Reset option (use auto-sync or zero)

**Acceptance**: Can manually align video and GPX, offset persists, map plays in sync.

---

### D4: Auto-sync (creation time matching) (3-4 hours)
**Files**: `src/services/AssetLoader.ts`, `src/utils/gpxParser.ts`

- [ ] Extract video creation date from metadata:
  - Use mediabunny or read file metadata
  - Many formats store in `creationTime` or `metadata.creation_time`
  - Parse as Date object
- [ ] Match with GPX start time:
  - GPX start time: `gpxPoints[0].time` (timestamp in ms)
  - Video creation time: convert to timestamp
  - Suggested offset: `offset = gpxStartTime - videoCreationTime`
- [ ] Suggest offset to user:
  - When GPX clip added to timeline, calculate auto-sync
  - Show toast/modal: "Auto-sync detected: offset = +1:23. Accept?"
  - User can accept or decline and use manual sync
- [ ] Handle missing metadata gracefully:
  - If no creation time, fall back to manual sync
  - Warn user

**Acceptance**: Auto-sync suggests reasonable offset, user can accept or override.

---

### D5: Map styling options (2-3 hours)
**Files**: `src/components/MapPanel.tsx`, `src/store/slices/timelineSlice.ts`

- [ ] Choose tile provider:
  - OSM (free, default)
  - Mapbox (requires API key, better styling)
  - Stadia Maps, CartoDB, etc.
  - Store in `projectSettings.mapTileProvider`
- [ ] Zoom level control:
  - Slider or buttons (+/-)
  - Store in `clip.properties.mapZoom` or project settings
- [ ] Track line customization:
  - Color picker
  - Line width slider
  - Opacity slider
  - Store in `clip.properties.trackStyle`
- [ ] Marker icon customization:
  - Choose from preset icons or upload custom
  - Store in `clip.properties.markerIcon`

**Acceptance**: Map appearance customizable (tiles, track style, marker).

---

### D6: Test map rendering in preview (2-3 hours)
**Files**: Multiple

- [ ] Verify map updates smoothly during playback:
  - No lag, jitter, or frame drops
  - Marker position updates every frame
- [ ] Check performance with long GPX tracks (1000+ points):
  - May need to simplify track (Douglas-Peucker algorithm)
  - Or only render visible portion
- [ ] Optimize tile loading/caching:
  - Leaflet handles most caching automatically
  - Ensure tiles load without blocking playback
  - Pre-load tiles for upcoming sections (optional optimization)
- [ ] Test with multiple map clips (if supported)

**Acceptance**: Map renders smoothly, no performance issues with typical GPX files.

---

## Testing

### Manual Testing
- [ ] GPX file loads, stats extracted correctly
- [ ] Map displays with full track polyline
- [ ] Marker moves with playback
- [ ] Manual sync aligns video and GPS accurately
- [ ] Auto-sync suggests reasonable offset
- [ ] Map tiles load without blocking
- [ ] Map styling options work

### Unit Tests
- `tests/unit/utils/gpxParser.test.ts` - Coordinate lookup, interpolation
- `tests/unit/utils/mapUtils.test.ts` - Tile calculations, coordinate conversions
- `tests/unit/components/MapOverlay.test.tsx` - Map rendering (with mocks)

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
