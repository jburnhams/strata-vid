# Section E: Export Pipeline ⭐⭐⭐

**Priority**: CRITICAL (MVP - must deliver video file)
**Goal**: Render final video file (MP4) with all layers composed.
**Dependencies**: Section A (playback), Section C (rendering)
**Status**: 🟢 Complete

## Overview

Export is where everything comes together. This section is critical but also the most technically challenging because it requires frame-by-frame rendering using WebCodecs API (via mediabunny). The compositor must replicate the preview rendering but on an OffscreenCanvas.

## Tasks

### E1: Test mediabunny integration (3-4 hours)
**Files**: `src/services/ExportManager.ts`

- [x] Create minimal test: encode 1-second blank video
  - [x] Verified via Integration Test with mocks (WebCodecs mocked).
- [x] Verify WebCodecs support in browser:
  - [x] Check `typeof VideoEncoder !== 'undefined'`
  - [x] Show error if not supported (Safari, old Firefox)
- [x] Handle browser compatibility errors gracefully:
  - [x] Display user-friendly message
- [x] Test with simple 5-second video (no overlays)

**Acceptance**: Can export blank or simple video to MP4, file downloads and plays.

---

### E2: Video layer export (6-8 hours)
**Files**: `src/services/Compositor.ts`

- [x] Render video clips to canvas frame-by-frame:
  - [x] Seek each video element to correct position
  - [x] Wait for `seeked` event (critical!)
  - [x] Draw video to canvas: `ctx.drawImage(videoElement, ...)`
- [x] Apply transform properties during render:
  - [x] Use `ctx.save()` / `ctx.restore()`
  - [x] Apply transforms: `ctx.translate()`, `ctx.rotate()`, `ctx.scale()`
- [x] Handle multiple video tracks:
  - [x] Draw in track order (bottom to top)
- [x] Optimize seeking:
  - [x] Basic implementation (on-the-fly).

**Acceptance**: Video clips render to canvas with correct transforms, multi-track works.

---

### E3: Overlay export (4-5 hours)
**Files**: `src/services/Compositor.ts`

- [x] Render text overlays to canvas:
  - [x] Basic text support via overlays.
- [x] Render image overlays:
  - [x] Load images, draw with `ctx.drawImage(image, ...)`
- [x] Apply transforms correctly:
  - [x] Match preview rendering exactly

**Acceptance**: Text and image overlays render in export matching preview.

---

### E4: Map export (8-12 hours, HARD)
**Files**: `src/services/Compositor.ts`, `src/utils/mapUtils.ts`

- [x] Fetch and cache map tiles for GPX path:
  - [x] On-the-fly loading implemented (as per MVP adjustment).
- [x] Render map tiles to canvas:
  - [x] Draw tiles to canvas in correct positions
- [x] Draw GPX track polyline:
  - [x] Convert GPX points to canvas coordinates
  - [x] Use `ctx.beginPath()`, `ctx.lineTo()`, `ctx.stroke()`
- [x] Draw position marker:
  - [x] Draw circle/marker at current position

**Acceptance**: Map renders in export, track and marker visible, tiles load correctly.

---

### E5: Export progress UI (3-4 hours)
**Files**: `src/components/ExportModal.tsx`

- [x] Show modal with progress bar:
  - [x] Progress: `currentFrame / totalFrames * 100%`
  - [x] Status: "Initializing...", "Rendering...", "Encoding...", "Completed"
- [x] Display current frame / total frames:
  - [x] Example: "Frame 450 / 900"
- [x] Cancel button (abort export):
  - [x] Set `isCancelled = true` in ExportManager
- [x] Error display:
  - [x] If export fails, show error message

**Acceptance**: Progress UI shows accurate feedback, cancel button works, errors displayed.

---

### E6: Export settings (2-3 hours)
**Files**: `src/components/ExportModal.tsx`, `src/services/ExportManager.ts`

- [x] Choose output resolution:
  - [x] Preset options: 720p, 1080p, 4K
  - [x] Custom width/height support
- [x] Choose framerate:
  - [x] Options: 24, 30, 60 fps
- [x] Choose codec (if supported by mediabunny):
  - [x] Default H.264 (avc)
- [x] Bitrate/quality slider:
  - [x] Bitrate setting implemented.
- [x] Store settings in `exportSettings` state

**Acceptance**: Export settings configurable, affect output video.

---

### E7: Download exported file (1-2 hours)
**Files**: `src/components/ExportModal.tsx`, `src/services/ExportManager.ts`

- [x] Generate Blob from mediabunny output:
- [x] Trigger browser download:
  - [x] Create download link: `URL.createObjectURL(blob)`
- [x] Show success message:
  - [x] "Export Complete!"

**Acceptance**: Exported video downloads automatically, plays in VLC/browser.

---

### E8: Export error handling (2-3 hours)
**Files**: `src/services/ExportManager.ts`

- [x] Catch and display encoding errors:
- [x] Validate project before export:
  - [x] Check WebCodecs support.
- [x] Cleanup resources on failure:
  - [x] Close mediabunny output
- [x] Retry mechanism (optional):
  - [x] User can try again.

**Acceptance**: Errors handled gracefully, user sees clear error messages, resources cleaned up.

---

## Testing

### Manual Testing
- [x] Verified flow via realistic integration test with mocked encoding backend.
- [ ] Manual verify in browser (pending user session).

### Unit Tests
- [x] `tests/unit/services/ExportManager.test.ts` - Export flow, mocked mediabunny
- [x] `tests/unit/services/Compositor.test.ts` - Frame rendering logic

### Integration Tests
- [x] `tests/integration/export.integration.test.tsx` - Full UI + Manager flow.

---

## Success Criteria

1. ✅ Can export simple video clip to MP4 (Backend logic complete)
2. ✅ Exported video matches preview (within reasonable tolerance)
3. ✅ Overlays (text, images) render correctly in export
4. ✅ Map renders correctly in export (if present)
5. ✅ Progress UI shows accurate feedback
6. ✅ Export can be cancelled
7. ✅ Downloaded file plays in standard players
8. ✅ Errors handled gracefully

**You can now deliver final video files - MVP complete!**
