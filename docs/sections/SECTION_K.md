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

- [ ] **K2: Elevation profile** (6-8 hours)
  - Display elevation graph below map
  - Highlight current position
  - Files: `src/components/preview/ElevationProfile.tsx` (new), `src/components/MapPanel.tsx` (updated)

- [ ] **K3: Data overlays on video** (5-6 hours)
  - Display speed, distance, elevation as text
  - Real-time updates
  - Customizable styling
  - Files: `src/components/preview/DataOverlay.tsx` (new), `src/components/preview/OverlayRenderer.tsx` (updated)

- [ ] **K4: Custom map styles** (3-4 hours)
  - Mapbox styles, satellite view
  - Dark mode maps
  - Custom tile URL
  - Files: `src/components/MapPanel.tsx`, `src/components/MetadataPanel.tsx` (verified)

- [ ] **K5: Track simplification** (4-5 hours)
  - Reduce GPX points (Douglas-Peucker)
  - Maintain visual fidelity
  - Files: `src/utils/gpxParser.ts`, `src/services/AssetLoader.ts`, `src/components/MetadataPanel.tsx`

- [ ] **K6: Heatmap visualization** (8-10 hours)
  - Speed or heart rate heatmap on route
  - Requires GPX extensions
  - Files: `src/components/preview/HeatmapOverlay.tsx` (new), `src/components/MapPanel.tsx` (updated), `src/components/MetadataPanel.tsx` (updated)

## Success Criteria
- Multiple GPX tracks overlay
- Elevation profile displays
- Data overlays show stats
- Custom map styles work
