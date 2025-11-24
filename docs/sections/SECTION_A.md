# Section A: Playback Foundation ⭐⭐⭐

**Priority**: CRITICAL (Start here!)
**Goal**: Get basic video playback working in the preview panel.
**Dependencies**: None
**Status**: 🟢 Complete

## Overview

This is the foundation of the entire application. Without working playback, you can't verify that anything else works correctly. This section focuses on getting video to actually play in the browser with transport controls and timeline synchronization.

## Tasks

### A1: Install dependencies ✅ (Prerequisite)
**Effort**: 5 minutes
**Files**: `package.json`, `package-lock.json`

- [x] Run `npm install` to get all packages
- [x] Verify build with `npm run dev`
- [x] Fix any dependency conflicts
- [x] Ensure mediabunny, react-leaflet, and other key packages installed correctly

**Acceptance**: Dev server starts without errors, app loads in browser.

---

### A2: Create visible transport controls
**Effort**: 2-3 hours
**Files**: `src/components/TransportControls.tsx` (new), `src/components/PreviewPanel.tsx`

**Tasks**:
- [x] Create new component: `TransportControls.tsx`
- [x] Add Play/Pause/Stop buttons with icons (lucide-react)
- [x] Add current time readout (format: `MM:SS.mmm`)
- [x] Wire buttons to `playbackSlice` actions:
  - `play()` - sets `isPlaying = true`
  - `pause()` - sets `isPlaying = false`
  - `stop()` - sets `isPlaying = false`, `currentTime = 0`
- [x] Display playback rate indicator (1x, 2x, etc.)
- [x] Style with Tailwind to match app theme
- [x] Position below or overlaid on preview panel

**Acceptance**: Clicking Play button toggles `isPlaying` state (verify in React DevTools or Zustand DevTools).

---

### A3: Verify video playback in preview
**Effort**: 4-6 hours
**Files**: `src/components/preview/VideoPlayer.tsx`, `src/hooks/usePlaybackLoop.ts`

**Tasks**:
- [x] Test VideoPlayer component with actual video file:
  - Load a short MP4 via Library panel
  - Verify video element receives correct `src` (Blob URL)
  - Check that video element is visible in DOM
- [x] Ensure video seeks correctly based on `currentTime`:
  - When `currentTime` changes, video.currentTime should update
  - Handle clip offset: `video.currentTime = (globalTime - clip.start) + clip.offset`
- [x] Verify play/pause state triggers video playback:
  - When `isPlaying = true`, call `video.play()`
  - When `isPlaying = false`, call `video.pause()`
- [x] Fix timing drift issues:
  - Use `requestAnimationFrame` to update `currentTime`
  - Check if video.currentTime deviates from expected, re-seek if > 0.1s
- [x] Handle edge cases:
  - Clip ends before timeline ends (hide video)
  - Multiple clips on timeline (switch active video)
  - No clips at current time (show blank/placeholder)

**Debugging tips**:
- Use `console.log` in VideoPlayer to see when it renders
- Check browser DevTools → Network to verify video loaded
- Use video element events: `onLoadedMetadata`, `onSeeked`, `onPlay`, `onPause`

**Acceptance**: Video plays smoothly when Play button clicked, pauses when Pause clicked, stays in sync with `currentTime`.

---

### A4: Add playhead to timeline
**Effort**: 3-4 hours
**Files**: `src/components/timeline/Playhead.tsx` (new), `src/components/timeline/TimelineContainer.tsx`

**Tasks**:
- [x] Create `Playhead.tsx` component:
  - Render as vertical line (e.g., 2px wide, red/orange color)
  - Position absolutely within timeline container
  - Calculate position: `left = currentTime * zoomLevel`
  - Height spans all tracks
- [x] Make playhead draggable:
  - Use `@dnd-kit` or simple mouse events
  - On drag, calculate new time: `newTime = mouseX / zoomLevel`
  - Update `setCurrentTime(newTime)` in store
  - Clamp to valid range: `0 <= time <= projectDuration`
- [x] Add snap-to-frame option (optional):
  - Round time to nearest frame: `Math.round(time * fps) / fps`
- [x] Visual feedback:
  - Change cursor to `ew-resize` on hover
  - Highlight playhead when dragging
  - Show tooltip with current time while dragging

**Acceptance**: Playhead visible on timeline, can drag to scrub video, video seeks to dragged position.

---

### A5: Sync playhead with preview
**Effort**: 2-3 hours
**Files**: `src/hooks/usePlaybackLoop.ts`, `src/components/timeline/TimelineContainer.tsx`, `src/components/PreviewPanel.tsx`

**Tasks**:
- [x] Verify `usePlaybackLoop` updates `currentTime` smoothly:
  - Should increment by `delta` (time since last frame)
  - Use `performance.now()` for high precision
  - Only update when `isPlaying = true`
- [x] Verify timeline playhead position updates reactively:
  - Should re-render when `currentTime` changes
  - Use Zustand selector: `const currentTime = useProjectStore(state => state.currentTime)`
- [x] Verify video seeks when playhead dragged:
  - Dragging playhead → `setCurrentTime` → VideoPlayer re-renders → video seeks
  - May need `useEffect` in VideoPlayer to listen for `currentTime` changes
- [x] Auto-scroll timeline to keep playhead visible:
  - If playhead position `> containerWidth`, scroll container
  - Option: "Follow Playhead" toggle
  - Implement smooth scroll (CSS `scroll-behavior: smooth` or manual)

**Testing**:
- Play video, observe playhead moving on timeline
- Drag playhead, observe video jumping to new position
- Verify timeline auto-scrolls during playback (if implemented)

**Acceptance**: Playhead and video stay in perfect sync during playback and scrubbing.

---

### A6: Basic keyboard shortcuts
**Effort**: 2-3 hours
**Files**: `src/hooks/useKeyboardShortcuts.ts` (new), `src/App.tsx`

**Tasks**:
- [x] Create `useKeyboardShortcuts` hook:
  - Listen for `keydown` events
  - Map keys to actions (see table below)
  - Prevent default browser behavior where needed
- [x] Implement shortcuts:

| Key | Action |
|-----|--------|
| Space | Toggle Play/Pause |
| K | Toggle Play/Pause (alternate) |
| J | Rewind (step back 1 second or 1 frame) |
| L | Fast forward (step forward 1 second or 1 frame) |
| Left Arrow | Step back 1 frame (`currentTime -= 1/fps`) |
| Right Arrow | Step forward 1 frame (`currentTime += 1/fps`) |
| Home | Jump to start (`currentTime = 0`) |
| End | Jump to end (`currentTime = projectDuration`) |

- [x] Add keyboard shortcut reference:
  - Tooltip or modal showing shortcuts (press `?` to open)
  - Can defer to Section G if time-constrained

**Edge cases**:
- Don't trigger if user is typing in an input field
- Check `event.target.tagName !== 'INPUT'`

**Acceptance**: Pressing Space plays/pauses video. Arrow keys step through frames. Home/End jump to start/end.

---

## Testing

### Manual Testing Checklist
- [x] Load a video file → appears in library
- [x] Video auto-adds to timeline (or manually drag)
- [x] Click Play → video plays
- [x] Click Pause → video pauses
- [x] Click Stop → video pauses and returns to 0:00
- [x] Drag playhead → video seeks
- [x] Press Space → video plays/pauses
- [x] Press Left/Right → video steps frame-by-frame
- [x] Playhead stays in sync during playback

### Unit Tests (Complete)
- [x] `tests/unit/hooks/usePlaybackLoop.test.ts` - Test time update logic
- [x] `tests/unit/hooks/useKeyboardShortcuts.test.ts` - Test key mappings
- [x] `tests/unit/components/TransportControls.test.tsx` - Test button clicks
- [x] `tests/unit/components/preview/VideoPlayer.test.tsx` - Test playback sync
- [x] `tests/unit/components/timeline/Playhead.test.tsx` - Test drag interaction

### Integration Tests (Complete)
- [x] `tests/integration/playback.integration.test.tsx` - Load video, play, pause, scrub full flow

---

## Success Criteria

This section is **complete** when:
1. ✅ Video loads and displays in preview panel
2. ✅ Play/Pause/Stop buttons work
3. ✅ Playhead visible on timeline and syncs with video
4. ✅ Can scrub by dragging playhead
5. ✅ Keyboard shortcuts (Space, arrows, Home/End) work
6. ✅ Video stays in sync with timeline (no drift)

**When complete, you have a functional video player!** This is the foundation for all other features.

---

## Next Steps

After completing Section A, you can work on:
- **Section B** (Timeline Editing) - Make timeline interactive
- **Section C** (Preview Rendering) - Add overlays
- Both can be developed in parallel

See [docs/IMPLEMENTATION.md](../IMPLEMENTATION.md) for the full roadmap.
