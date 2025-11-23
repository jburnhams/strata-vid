# Section E: Export Pipeline ⭐⭐⭐

**Priority**: CRITICAL (MVP - must deliver video file)
**Goal**: Render final video file (MP4) with all layers composed.
**Dependencies**: Section A (playback), Section C (rendering)
**Status**: 🔴 Scaffolded, completely untested

## Overview

Export is where everything comes together. This section is critical but also the most technically challenging because it requires frame-by-frame rendering using WebCodecs API (via mediabunny). The compositor must replicate the preview rendering but on an OffscreenCanvas.

## Tasks

### E1: Test mediabunny integration (3-4 hours)
**Files**: `src/services/ExportManager.ts`

- [ ] Create minimal test: encode 1-second blank video
  - Create 30 frames (assuming 30 fps) of solid color
  - Use mediabunny Output, Mp4OutputFormat, BufferTarget
  - Encode frames using CanvasSource
  - Generate Blob and download
- [ ] Verify WebCodecs support in browser:
  - Check `typeof VideoEncoder !== 'undefined'`
  - Show error if not supported (Safari, old Firefox)
- [ ] Handle browser compatibility errors gracefully:
  - Display user-friendly message
  - Suggest using Chrome/Edge
- [ ] Test with simple 5-second video (no overlays)

**Acceptance**: Can export blank or simple video to MP4, file downloads and plays.

---

### E2: Video layer export (6-8 hours)
**Files**: `src/services/Compositor.ts`

- [ ] Render video clips to canvas frame-by-frame:
  - For each frame time `t`:
    - Find active video clips at time `t`
    - Seek each video element to correct position
    - Wait for `seeked` event (critical!)
    - Draw video to canvas: `ctx.drawImage(videoElement, ...)`
- [ ] Apply transform properties during render:
  - Use `ctx.save()` / `ctx.restore()`
  - Apply transforms: `ctx.translate()`, `ctx.rotate()`, `ctx.scale()`
  - Set opacity: `ctx.globalAlpha`
  - Draw video at calculated position/size
- [ ] Handle multiple video tracks:
  - Draw in track order (bottom to top)
  - Each track's clip drawn separately
- [ ] Optimize seeking:
  - Seeking is slow, minimize seeks
  - For sequential frames, may not need to seek if delta is small

**Acceptance**: Video clips render to canvas with correct transforms, multi-track works.

---

### E3: Overlay export (4-5 hours)
**Files**: `src/services/Compositor.ts`

- [ ] Render text overlays to canvas:
  - Use `ctx.fillText()` or `ctx.strokeText()`
  - Apply font, color, alignment from clip.properties
  - Position using transforms
  - Alternative: Render DOM to canvas (using html2canvas or similar - complex)
- [ ] Render image overlays:
  - Load images, draw with `ctx.drawImage(image, ...)`
  - Apply transforms
  - Cache images to avoid reloading each frame
- [ ] Apply transforms correctly:
  - Match preview rendering exactly
  - Test: compare preview screenshot vs. export screenshot

**Acceptance**: Text and image overlays render in export matching preview.

---

### E4: Map export (8-12 hours, HARD)
**Files**: `src/services/Compositor.ts`, `src/utils/mapUtils.ts`

- [ ] Fetch and cache map tiles for GPX path:
  - Calculate which tiles needed for full GPX track
  - Download tiles before export starts (show "Pre-loading tiles..." progress)
  - Cache in Map<tileUrl, HTMLImageElement>
- [ ] Render map tiles to canvas:
  - For each frame time `t`:
    - Get current position from GPX
    - Calculate map bounds (based on zoom level)
    - Determine which tiles are visible
    - Draw tiles to canvas in correct positions
- [ ] Draw GPX track polyline:
  - Convert GPX points to canvas coordinates (based on map zoom/center)
  - Use `ctx.beginPath()`, `ctx.lineTo()`, `ctx.stroke()`
  - Apply track style (color, width)
- [ ] Draw position marker:
  - Get current position
  - Convert to canvas coordinates
  - Draw circle, arrow, or icon
- [ ] Optimize: pre-fetch tiles before export starts:
  - Calculate all unique tiles needed
  - Download and cache
  - Show progress: "Downloading 147/200 tiles..."

**Challenges**:
- Tile coordinate math (lat/lon → tile coordinates → pixel coordinates)
- Network: downloading many tiles is slow
- Cache management: many tiles = lots of memory

**Acceptance**: Map renders in export, track and marker visible, tiles load correctly.

---

### E5: Export progress UI (3-4 hours)
**Files**: `src/components/ExportModal.tsx`

- [ ] Show modal with progress bar:
  - Progress: `currentFrame / totalFrames * 100%`
  - Estimated time remaining (based on frames/second rate)
  - Status: "Initializing...", "Rendering...", "Encoding...", "Completed"
- [ ] Display current frame / total frames:
  - Example: "Frame 450 / 900"
- [ ] Cancel button (abort export):
  - Set `isCancelled = true` in ExportManager
  - Cleanup resources (video elements, canvas, output)
  - Close modal
- [ ] Error display:
  - If export fails, show error message
  - Option to retry or download log

**Acceptance**: Progress UI shows accurate feedback, cancel button works, errors displayed.

---

### E6: Export settings (2-3 hours)
**Files**: `src/components/ExportModal.tsx`, `src/services/ExportManager.ts`

- [ ] Choose output resolution:
  - Preset options: 720p (1280x720), 1080p (1920x1080), 4K (3840x2160)
  - Or custom width/height
  - Note: higher resolution = slower export
- [ ] Choose framerate:
  - Options: 24, 30, 60 fps
  - Higher fps = smoother but larger file
- [ ] Choose codec (if supported by mediabunny):
  - H.264 (avc) - best compatibility
  - H.265 (hevc) - better compression, less compatible
  - VP9 - WebM (optional)
- [ ] Bitrate/quality slider:
  - Higher bitrate = better quality, larger file
  - Range: 2 Mbps to 20 Mbps
- [ ] Store settings in `exportSettings` state

**Acceptance**: Export settings configurable, affect output video.

---

### E7: Download exported file (1-2 hours)
**Files**: `src/components/ExportModal.tsx`, `src/services/ExportManager.ts`

- [ ] Generate Blob from mediabunny output:
  - `output.target.buffer` (BufferTarget)
  - Create Blob: `new Blob([buffer], { type: 'video/mp4' })`
- [ ] Trigger browser download:
  - Create download link: `URL.createObjectURL(blob)`
  - Programmatically click link: `link.click()`
  - Suggested filename: `project-name-YYYY-MM-DD.mp4`
- [ ] Option: Save to File System Access API if available:
  - More control over save location
  - Chrome 86+, not widely supported yet
  - Fall back to download if not available
- [ ] Show success message:
  - "Export complete! Video saved."
  - Option to export again or close modal

**Acceptance**: Exported video downloads automatically, plays in VLC/browser.

---

### E8: Export error handling (2-3 hours)
**Files**: `src/services/ExportManager.ts`

- [ ] Catch and display encoding errors:
  - WebCodecs errors (codec not supported, etc.)
  - Out-of-memory errors
  - Network errors (tile loading)
- [ ] Validate project before export:
  - Check for missing assets (Blob URLs expired?)
  - Check for clips with invalid offsets
  - Warn if project duration > 10 minutes (long export)
- [ ] Cleanup resources on failure:
  - Close mediabunny output
  - Clear video pool, caches
  - Release Blob URLs
- [ ] Retry mechanism (optional):
  - If export fails midway, option to resume
  - Save partial progress?

**Acceptance**: Errors handled gracefully, user sees clear error messages, resources cleaned up.

---

## Testing

### Manual Testing
- [ ] Export simple 5-second video with one clip → plays correctly
- [ ] Export with multiple video tracks → layers correct
- [ ] Export with text overlay → text appears
- [ ] Export with image overlay → image appears
- [ ] Export with map → map and track render (HARD TEST)
- [ ] Export long video (2+ minutes) → progress UI updates
- [ ] Cancel export midway → no errors, cleanup successful
- [ ] Export with different settings (resolution, fps) → settings applied
- [ ] Downloaded file plays in VLC, Chrome, phone, etc.

### Unit Tests
- `tests/unit/services/ExportManager.test.ts` - Export flow, mocked mediabunny
- `tests/unit/services/Compositor.test.ts` - Frame rendering logic

### Integration Tests
- Full export flow test (may be slow, run separately)

---

## Success Criteria

1. ✅ Can export simple video clip to MP4
2. ✅ Exported video matches preview (within reasonable tolerance)
3. ✅ Overlays (text, images) render correctly in export
4. ✅ Map renders correctly in export (if present)
5. ✅ Progress UI shows accurate feedback
6. ✅ Export can be cancelled
7. ✅ Downloaded file plays in standard players
8. ✅ Errors handled gracefully

**You can now deliver final video files - MVP complete!**

---

## Known Challenges

- **Map export is HARD**: Tile coordinate math, network latency, caching
- **Seeking is slow**: Video seeking may bottleneck export speed
- **Memory**: Long exports with many assets can exhaust memory
- **Audio**: Not yet implemented (Section I)

## Next Steps

After MVP (Sections A-E):
- **Section F** (Project Management) - Don't lose work!
- **Section G** (UX) - Polish the experience
- **Section I** (Audio) - Add audio tracks and mixing

See [docs/IMPLEMENTATION.md](../IMPLEMENTATION.md) for full roadmap.
