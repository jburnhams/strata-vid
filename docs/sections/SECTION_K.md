# Section K: Advanced Map Features ⭐

**Priority**: Low (enhanced visualizations)
**Goal**: Enhanced map visualizations, multiple tracks, elevation profiles.
**Dependencies**: Section D (basic map integration)
**Status**: 🟡 In Progress

## Tasks

- [x] **K1: Multiple GPX tracks** (4-5 hours)
  - Support multiple GPX overlays via `extraTrackAssets` in Clip
  - Different colors for each
  - Implemented UI in `MetadataPanel` to add, remove, and style extra tracks.
  - Files: `src/components/MapPanel.tsx`, `src/types.ts`, `src/services/Compositor.ts`, `src/components/MetadataPanel.tsx`

- [x] **K2: Elevation profile** (6-8 hours)
  - Display elevation graph below map
  - Highlight current position
  - Implemented as a toggleable component within `MapPanel`. Supports track selection, hover tooltips, and click-to-seek.
  - Files: `src/components/preview/ElevationProfile.tsx` (new), `src/components/MapPanel.tsx` (updated), `src/components/PreviewPanel.tsx` (updated)

- [x] **K3: Data overlays on video** (5-6 hours)
  - Display speed, distance, elevation as text
  - Real-time updates
  - Customizable styling
  - Implemented as a new 'data' clip type with configurable units and text styles in the `MetadataPanel`.
  - Files: `src/components/preview/DataOverlay.tsx` (new), `src/components/preview/OverlayRenderer.tsx` (updated), `src/components/MetadataPanel.tsx` (updated), `src/types.ts` (updated)

- [x] **K4: Custom map styles** (3-4 hours)
  - Mapbox styles, satellite view
  - Dark mode maps
  - Custom tile URL
  - Implemented 'dark' and 'custom' map styles, with a UI for custom URLs in `MetadataPanel`.
  - Files: `src/components/MapPanel.tsx`, `src/components/MetadataPanel.tsx`, `src/types.ts`

- [x] **K5: Track simplification** (4-5 hours)
  - Reduce GPX points (Douglas-Peucker)
  - Maintain visual fidelity
  - Added a "Re-process" button to the `MetadataPanel` to re-apply simplification with a new tolerance.
  - Files: `src/utils/gpxParser.ts`, `src/services/AssetLoader.ts`, `src/components/MetadataPanel.tsx`, `src/store/slices/assetsSlice.ts`

- [x] **K6: Heatmap visualization** (8-10 hours)
  - Speed or heart rate heatmap on route
  - Requires GPX extensions
  - Implemented as a canvas overlay on the map, with options for data source (speed/elevation) in the `MetadataPanel`.
  - Files: `src/components/preview/HeatmapOverlay.tsx` (new), `src/components/MapPanel.tsx` (updated), `src/components/MetadataPanel.tsx` (updated)

## Success Criteria
- Multiple GPX tracks overlay
- Elevation profile displays
- Data overlays show stats
- Custom map styles work
- Track simplification is functional
- Heatmap visualization is functional
