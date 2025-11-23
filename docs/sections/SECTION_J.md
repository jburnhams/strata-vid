# Section J: Performance & Optimization ⭐

**Priority**: Low (scale up)
**Goal**: Optimize for large projects, long videos, many assets.
**Dependencies**: All core sections (A-E)
**Status**: 🔴 Not implemented

## Tasks

- [ ] **J1: Virtual scrolling for timeline** (6-8 hours)
  - Render only visible tracks/clips
  - Handle 100+ clips
  - Library: react-window or custom
  - Files: `src/components/timeline/TimelineContainer.tsx`

- [ ] **J2: Lazy asset loading** (4-5 hours)
  - Load assets on-demand
  - Unload unused assets
  - Files: `src/services/AssetLoader.ts`

- [ ] **J3: Web Worker for export** (8-10 hours)
  - Offload export to Worker
  - Keep UI responsive
  - Files: `src/workers/exportWorker.ts` (new)

- [ ] **J4: Debounce expensive operations** (2-3 hours)
  - Debounce zoom/scroll
  - Throttle playback updates
  - Files: `src/hooks/useDebounce.ts` (new)

- [ ] **J5: Memory profiling** (4-6 hours)
  - Profile with Chrome DevTools
  - Fix memory leaks
  - Limit cache sizes

- [ ] **J6: Frame dropping strategy** (3-4 hours)
  - Drop frames if preview can't keep up
  - Display performance warning
  - Files: `src/hooks/usePlaybackLoop.ts`

## Success Criteria
- Handles 50+ clips without lag
- Export doesn't freeze UI
- Memory usage stays reasonable (<500MB)
- Timeline scrolling smooth
