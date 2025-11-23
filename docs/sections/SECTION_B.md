# Section B: Timeline Editing ⭐⭐⭐

**Priority**: CRITICAL (MVP)
**Goal**: Make timeline fully interactive - drag, resize, and arrange clips.
**Dependencies**: Section A (need playback working to see results)
**Status**: 🟨 Partially implemented

## Overview

Turn the timeline from a static visualization into a full-featured editing interface. Users should be able to manipulate clips directly on the timeline with drag-and-drop, resize handles, and multi-track support.

## Tasks

### B1: Fix clip rendering on timeline
**Effort**: 3-4 hours
**Files**: `src/components/timeline/ClipItem.tsx`, `src/components/timeline/TrackLane.tsx`

- [ ] Ensure clips appear as visual blocks on track lanes
- [ ] Display clip name on clip block (or first N characters)
- [ ] Show clip duration visually (width = duration × zoomLevel pixels)
- [ ] Color-code by clip type:
  - Video: Blue
  - Audio: Green
  - Overlay: Purple
  - Map: Orange
- [ ] Add subtle shadow/border for depth
- [ ] Show asset thumbnail if available (see Section G)

**Acceptance**: Clips visible as colored rectangles on timeline with correct width.

---

### B2: Implement drag-to-move
**Effort**: 4-6 hours
**Files**: `src/components/timeline/TimelineContainer.tsx`, `src/components/timeline/ClipItem.tsx`

- [ ] Make ClipItem draggable using `@dnd-kit`:
  - Wrap in `<Draggable id={clip.id}>`
  - Set up DndContext in TimelineContainer
- [ ] Update clip `start` time when dropped:
  - Calculate new start: `mouseX / zoomLevel`
  - Call `moveClip(clipId, newStart)`
- [ ] Support dragging to different tracks:
  - Detect which track lane clip is over
  - Update both `start` and `trackId` if changed
  - Call `moveClip(clipId, newStart, newTrackId)`
- [ ] Show ghost/preview while dragging:
  - Use `<DragOverlay>` to show semi-transparent copy
  - Original clip fades out (opacity: 0.3)
- [ ] Visual feedback for valid/invalid drop zones

**Acceptance**: Can drag clips horizontally and between tracks, changes persist.

---

### B3: Implement resize handles
**Effort**: 5-7 hours
**Files**: `src/components/timeline/ClipItem.tsx`

- [ ] Add left and right resize handles to ClipItem:
  - Small divs (8px wide) on each edge
  - Different cursor: `ew-resize`
  - Distinct visual (darker color, icon optional)
- [ ] Drag left handle (trim in-point):
  - Adjust both `offset` and `start`:
    - `offset += delta`
    - `start += delta`
    - `duration -= delta`
  - Constrain: `offset >= 0`, `offset < asset.duration`
- [ ] Drag right handle (trim out-point):
  - Adjust `duration`:
    - `duration += delta`
  - Constrain: `offset + duration <= asset.duration`
- [ ] Show tooltip with timecode while resizing:
  - Display current in/out points
  - Update in real-time during drag
- [ ] Call `resizeClip(clipId, newDuration, newOffset)` on drag end

**Acceptance**: Can trim clips from both ends, constraints respected, changes persist.

---

### B4: Snapping logic
**Effort**: 3-4 hours
**Files**: `src/utils/timelineUtils.ts` (new), `src/components/timeline/TimelineContainer.tsx`

- [ ] Implement snap-to logic:
  - Snap clip edges to other clip edges (within ± 0.1s)
  - Snap to playhead position
  - Snap to timeline start (0:00)
  - Snap to markers (if implemented in Section H)
- [ ] Create `getSnapTarget(time, allClips, playheadTime)` utility:
  - Returns nearest snap point if within threshold
  - Returns null if no snap
- [ ] Visual feedback when snapping:
  - Flash vertical line at snap position
  - Or subtle "bump" animation
- [ ] Make snapping toggle-able (hold Shift to disable?)

**Acceptance**: Clips snap to adjacent clips and playhead, visual feedback shows snap.

---

### B5: Collision detection
**Effort**: 3-4 hours
**Files**: `src/components/timeline/TimelineContainer.tsx`, `src/store/slices/timelineSlice.ts`

- [ ] Prevent clips from overlapping on same track:
  - Before `moveClip`, check if new position overlaps existing clip
  - If overlap detected, reject move or snap to adjacent position
- [ ] Show invalid drop zone feedback:
  - Red outline or "prohibited" cursor when dragging over invalid position
- [ ] Option: Allow overlap with visual warning (for advanced users):
  - Store preference in `projectSettings.allowOverlaps`
  - Show warning icon on overlapping clips
- [ ] Handle edge case: moving clip may push adjacent clips (ripple mode)
  - Defer to Section H (advanced) or implement simple version

**Acceptance**: Cannot create overlapping clips on same track, invalid positions rejected.

---

### B6: Multi-track support
**Effort**: 4-5 hours
**Files**: `src/components/TimelinePanel.tsx`, `src/components/timeline/TrackHeader.tsx`, `src/store/slices/timelineSlice.ts`

- [ ] Add "New Track" button to timeline panel:
  - Click → prompt for track type (video, audio, overlay)
  - Generate unique track ID
  - Call `addTrack({ id, type, label, isMuted: false, isLocked: false, clips: [] })`
- [ ] Render tracks in correct stacking order:
  - `trackOrder` array determines render order
  - Top track in UI = foreground in preview (highest z-index)
- [ ] Delete track functionality:
  - Right-click track header → Delete
  - Show confirmation if track has clips
  - Call `removeTrack(trackId)`
  - Optionally delete all clips on track
- [ ] Track reordering (drag track header to reorder):
  - Update `trackOrder` array
  - Defer if complex, not critical for MVP

**Acceptance**: Can add/delete tracks, tracks render in correct order, clips can be moved between tracks.

---

### B7: Clip selection and context menu
**Effort**: 4-5 hours
**Files**: `src/components/timeline/ClipItem.tsx`, `src/components/timeline/ContextMenu.tsx` (new)

- [ ] Click to select clip:
  - Store `selectedClipId` in local state or store
  - Highlight selected clip (thicker border, glow effect)
  - Deselect on click outside
- [ ] Right-click context menu:
  - Menu options: Delete, Duplicate, Split (defer to Section H)
  - Position menu at mouse cursor
  - Use library or build custom context menu
- [ ] Delete key removes selected clip:
  - Listen for `keydown` event
  - If `key === 'Delete'` and `selectedClipId`, call `removeClip(selectedClipId)`
- [ ] Multi-select (optional, can defer):
  - Shift+Click: extend selection
  - Ctrl+Click (Cmd+Click): toggle selection
  - Store `selectedClipIds[]` instead of single ID

**Acceptance**: Can select clip by clicking, delete with Delete key or context menu.

---

### B8: Timeline zoom and scroll
**Effort**: 3-4 hours
**Files**: `src/components/timeline/TimelineContainer.tsx`, `src/components/timeline/ZoomControls.tsx` (new)

- [ ] Zoom in/out controls:
  - + / - buttons
  - Mouse wheel zoom (Ctrl+Wheel or pinch gesture)
  - Update `zoomLevel` (pixels per second) in state
  - Constrain: 5 px/s (zoomed out) to 200 px/s (zoomed in)
- [ ] Horizontal scrollbar for long timelines:
  - Use CSS `overflow-x: auto`
  - Or custom scrollbar component
- [ ] Zoom-to-fit button:
  - Calculate zoom level to fit all clips in viewport
  - Center on playhead or all clips
- [ ] Zoom anchored to mouse cursor (advanced):
  - When zooming, keep point under cursor fixed
  - Requires scroll position adjustment

**Acceptance**: Can zoom in/out, scroll horizontally, zoom-to-fit works.

---

## Testing

### Manual Testing Checklist
- [ ] Clips render correctly on timeline
- [ ] Can drag clips to new positions
- [ ] Can drag clips to different tracks
- [ ] Resize handles work (trim both ends)
- [ ] Clips snap to each other and playhead
- [ ] Cannot create overlapping clips
- [ ] Can add new tracks
- [ ] Can delete tracks and clips
- [ ] Zoom and scroll work smoothly

### Unit Tests
- `tests/unit/utils/timelineUtils.test.ts` - Snap logic, collision detection
- `tests/unit/store/timelineSlice.test.ts` - Timeline actions (already exists, expand)

### Integration Tests
- Full drag-and-drop flow test with Playwright

---

## Success Criteria

This section is **complete** when:
1. ✅ Clips visible and interactive on timeline
2. ✅ Drag-and-drop to move clips works
3. ✅ Resize handles trim clips
4. ✅ Snapping to clips/playhead works
5. ✅ No invalid overlaps allowed
6. ✅ Multi-track management (add/delete)
7. ✅ Clip selection and deletion works
8. ✅ Zoom and scroll functional

**You now have a fully functional timeline editor!**

---

## Next Steps

After completing Section B:
- **Section C** (Preview Rendering) - Add overlays and multi-layer composition
- **Section E** (Export) - Start testing video export

See [docs/IMPLEMENTATION.md](../IMPLEMENTATION.md) for full roadmap.
