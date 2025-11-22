# Section 02: Timeline UI

## Goal
Create the visual timeline component where users arrange clips, trim video, and manage tracks.

## Components

### 1. `TimelineContainer`
- The main wrapper.
- Handles horizontal scrolling and zooming.
- **Props**: `zoomLevel` (px per second).

### 2. `TrackHeader`
- Left sidebar of the timeline.
- Controls: Mute, Lock, Delete Track, Rename.

### 3. `TrackLane`
- The horizontal area where clips live.
- Droppable zone (using `@dnd-kit/core`).

### 4. `ClipItem`
- The visual representation of a clip.
- **Interactions**:
  - **Drag**: Move start time.
  - **Resize (Handles)**: Adjust duration (trimming).
  - **Select**: Update `selectedClipId` in store.

## Interaction Logic
- **Snapping**: Clips should snap to adjacent clips or the playhead when dragging.
- **Collision**: Prevent invalid overlaps on the same track (unless we decide to allow transitions later).
- **Auto-Scroll**: Dragging to the edge should scroll the timeline.

## Tasks
1.  [ ] **Scaffold Components**: Create basic visual layout.
2.  [ ] **Zoom Logic**: Implement zoom controls (update `pixelsPerSecond`).
3.  [ ] **Drag & Drop**: Integrate `@dnd-kit` for moving clips between tracks.
4.  [ ] **Resize**: Implement resize handles for trimming.
5.  [ ] **Ruler**: Draw a time ruler at the top.

## Testing
- **Integration**: Use Playwright to verify drag-and-drop functionality.
- **Unit**: Test the math for `pixels -> seconds` conversion.
