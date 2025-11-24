# Section H: Advanced Timeline Features ⭐

**Priority**: Low (power user features)
**Goal**: Transitions, effects, speed ramping, markers.
**Dependencies**: Sections A, B, C (basic editing working)
**Status**: 🔴 Not implemented

## Tasks

- [x] **H1: Split clip** (2-3 hours)
  - Right-click → Split at playhead
  - Creates two clips from one
  - Files: `src/store/slices/timelineSlice.ts`

- [x] **H2: Duplicate clip** (1-2 hours)
  - Copy clip with all properties
  - Files: `src/store/slices/timelineSlice.ts`

- [x] **H3: Ripple delete** (2-3 hours)
  - Delete clip and shift subsequent clips left
  - Files: `src/store/slices/timelineSlice.ts`

- [x] **H4: Crossfade transitions** (8-10 hours)
  - Add transition between clips
  - Types: Fade, Dissolve, Wipe
  - Render in preview and export
  - Files: `src/types.ts`, `src/components/preview/*`, `src/services/Compositor.ts`

- [ ] **H5: Speed ramping** (6-8 hours)
  - Clip property: playbackRate (0.5x, 2x)
  - Time-remapping curve
  - Files: `src/types.ts`, `src/components/preview/VideoPlayer.tsx`

- [ ] **H6: Markers** (4-5 hours)
  - Add colored markers on timeline
  - Jump to marker, label markers
  - Files: `src/types.ts`, `src/components/timeline/Marker.tsx` (new)

- [ ] **H7: Video filters/effects** (10-15 hours)
  - Brightness, Contrast, Saturation
  - Blur, Sharpen
  - Apply via CSS filters (preview) and canvas (export)
  - Files: `src/types.ts`, rendering logic

- [ ] **H8: Keyframe animation** (15-20 hours, HARD)
  - Animate clip properties over time
  - Keyframe editor UI
  - Easing functions
  - Files: `src/components/KeyframeEditor.tsx` (new)

## Success Criteria
- Can split and duplicate clips
- Transitions work between clips
- Speed ramping functional
- Markers help navigation
- Filters can be applied
