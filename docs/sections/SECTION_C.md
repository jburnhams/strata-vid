# Section C: Preview Rendering ⭐⭐

**Priority**: High (MVP)
**Goal**: Properly render all clip types (video, image, text, map) in preview.
**Dependencies**: Section A (playback foundation)
**Status**: 🟢 Complete

## Overview

Extend the preview panel to handle multiple simultaneous clips with proper layering, transforms, and different clip types. This builds on the basic video playback from Section A.

## Tasks

### C1: Layer composition (2-3 hours)
**Files**: `src/components/PreviewPanel.tsx`

- [x] Render clips in correct z-order (track order + clip zIndex)
- [x] Support multiple simultaneous video tracks (warning: browser limits ~6-10 video elements)
- [x] Implement basic blend modes if needed (CSS mix-blend-mode)
- [x] Handle clips on different tracks overlaying correctly

**Acceptance**: Multiple clips render simultaneously in correct stacking order.

---

### C2: Video clip rendering (3-4 hours)
**Files**: `src/components/preview/VideoPlayer.tsx`

- [x] Apply `properties` to video element:
  - Position: `transform: translate(x%, y%)`
  - Scale: `transform: scale()`
  - Opacity: `opacity: 0-1`
  - Rotation: `transform: rotate(deg)`
  - Use CSS transforms for performance
- [x] Handle edge case: clip offset beyond video duration (show placeholder or last frame)
- [x] Multiple video elements if multiple video tracks active
- [x] Optimize: reuse video elements when possible

**Acceptance**: Video transforms (position, rotation, opacity) work in preview.

---

### C3: Image overlay rendering (2-3 hours)
**Files**: `src/components/preview/OverlayRenderer.tsx`

- [x] Load and cache images (use Map to store loaded images)
- [x] Render as `<img>` with absolute positioning
- [x] Apply transform properties (same as video)
- [x] Handle image loading states (spinner while loading)

**Acceptance**: Image overlays render with correct position and transforms.

---

### C4: Text overlay rendering (3-4 hours)
**Files**: `src/components/preview/OverlayRenderer.tsx`

- [x] Render text content as styled `<div>`
- [x] Support basic styling:
  - Font family, size, weight
  - Color, background color
  - Text alignment
  - Padding, border
- [x] Apply position and transform properties
- [x] Make text properties editable in metadata panel (defer to Section G if needed)

**Acceptance**: Text overlays render with customizable style and position.

---

### C5: HTML overlay rendering (1-2 hours, optional)
**Files**: `src/components/preview/OverlayRenderer.tsx`

- [ ] Render arbitrary HTML content using `dangerouslySetInnerHTML`
- [ ] Sanitize HTML to prevent XSS (use DOMPurify or similar)
- [ ] Apply transform properties to container
- [ ] Warn user about security risks

**Acceptance**: HTML overlays render safely (or skip if not needed for MVP).
**Note**: Deferred to avoid extra dependency (`dompurify`) at this stage.

---

### C6: Preview quality settings (2-3 hours)
**Files**: `src/components/PreviewPanel.tsx`, `src/store/slices/projectSlice.ts`

- [x] Add quality toggle: Low / Medium / High
- [x] Scale preview resolution for performance:
  - Low: 480p (scale down 50%)
  - Medium: 720p (scale down 25%)
  - High: Full resolution
- [x] Maintain aspect ratio
- [x] Update preview canvas/container size based on quality
- [x] Store preference in `projectSettings.previewQuality`

**Acceptance**: Can toggle preview quality, lower quality improves performance.

---

### C7: Safe area guides (1-2 hours, optional)
**Files**: `src/components/preview/SafeAreaGuides.tsx` (new)

- [x] Toggle-able overlay showing title/action safe areas (90% / 80%)
- [x] Grid overlay option (3x3 or rule of thirds)
- [x] Center guides (crosshairs)
- [x] Semi-transparent lines, don't interfere with content
- [x] Toggle button in preview panel header

**Acceptance**: Safe area guides visible when enabled, help with composition.

---

## Testing

### Manual Testing
- [x] Multiple clips render simultaneously
- [x] Video transforms work (drag, scale, rotate in metadata panel - Section G)
- [x] Image overlays appear correctly
- [x] Text overlays with custom styles work
- [x] Preview quality toggle changes resolution
- [x] Safe area guides toggle works

### Unit Tests
- [x] `tests/unit/components/preview/OverlayRenderer.test.tsx` - Test clip type rendering

### Integration Tests
- [x] `tests/integration/PreviewRendering.test.tsx` - Basic composition
- [x] `tests/integration/PreviewAdvanced.test.tsx` - Advanced transforms, clip types (image/video), and safe areas

---

## Success Criteria

1. ✅ Multiple video tracks render simultaneously
2. ✅ Video transform properties work (position, scale, opacity, rotation)
3. ✅ Image and text overlays render correctly
4. ✅ Preview quality can be adjusted
5. ✅ Rendering order respects track order

**Preview panel now shows complex multi-layer compositions!**

---

## Next Steps

- **Section D** (Map & GPX) - Add map overlays with GPS sync
- **Section E** (Export) - Ensure export matches preview

See [docs/IMPLEMENTATION.md](../IMPLEMENTATION.md) for full roadmap.
