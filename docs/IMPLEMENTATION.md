# Implementation Roadmap

**Organization**: Tasks grouped by **section** (not phases) to enable parallel development.
**Dependencies**: Clearly marked - complete prerequisite sections first.
**Priority**: ⭐⭐⭐ (Critical MVP) → ⭐⭐ (Important) → ⭐ (Nice to have)

---

## Section A: Playback Foundation ⭐⭐⭐
**Goal**: Get basic video playback working in the preview panel.
**Dependencies**: None (start here!)
**Status**: 🟨 Partially implemented

### Tasks

- [ ] **A1: Install dependencies**
  - Run `npm install` to get all packages
  - Verify build with `npm run dev`
  - Fix any dependency conflicts

- [ ] **A2: Create visible transport controls**
  - Add Play/Pause/Stop buttons to PreviewPanel or separate TransportBar component
  - Wire buttons to `playbackSlice` actions (play, pause, stop)
  - Display current time readout
  - File: `src/components/TransportControls.tsx` (new)

- [ ] **A3: Verify video playback in preview**
  - Test VideoPlayer component with actual video file
  - Ensure video seeks correctly based on `currentTime`
  - Verify play/pause state changes trigger video element
  - Fix any timing drift issues
  - Files: `src/components/preview/VideoPlayer.tsx`, `src/hooks/usePlaybackLoop.ts`

- [ ] **A4: Add playhead to timeline**
  - Render vertical line on timeline at `currentTime`
  - Make playhead draggable to scrub through video
  - Update `currentTime` when playhead dragged
  - Files: `src/components/timeline/Playhead.tsx` (new), `src/components/timeline/TimelineContainer.tsx`

- [ ] **A5: Sync playhead with preview**
  - Verify timeline playhead moves when video plays
  - Verify video seeks when playhead dragged
  - Test with multiple clips on timeline
  - Auto-scroll timeline to keep playhead visible

- [ ] **A6: Basic keyboard shortcuts**
  - Space: Play/Pause
  - Left/Right Arrow: Step forward/back 1 frame
  - Home/End: Jump to start/end
  - J/K/L: Rewind/Pause/Forward
  - File: `src/hooks/useKeyboardShortcuts.ts` (new)

**Acceptance Criteria**:
- Video loads and plays when Play button clicked
- Playhead on timeline moves in sync with video
- Can scrub by dragging playhead
- Keyboard shortcuts work

---

## Section B: Timeline Editing ⭐⭐⭐
**Goal**: Make timeline fully interactive - drag, resize, and arrange clips.
**Dependencies**: Section A (need playback working to see results)
**Status**: 🟨 Partially implemented

### Tasks

- [ ] **B1: Fix clip rendering on timeline**
  - Ensure clips appear as visual blocks on track lanes
  - Display clip name/thumbnail on clip block
  - Show clip duration visually (width = duration × zoom)
  - Color-code by clip type (video, audio, overlay)
  - Files: `src/components/timeline/ClipItem.tsx`

- [ ] **B2: Implement drag-to-move**
  - Use `@dnd-kit` to make clips draggable
  - Update clip `start` time when dropped
  - Support dragging to different tracks (change trackId)
  - Show ghost/preview while dragging
  - Files: `src/components/timeline/TimelineContainer.tsx`, `src/components/timeline/ClipItem.tsx`

- [ ] **B3: Implement resize handles**
  - Add left/right handles to ClipItem
  - Drag left handle: adjust `offset` and `start` (ripple mode)
  - Drag right handle: adjust `duration`
  - Constrain to source asset duration
  - Show tooltip with timecode while resizing
  - Files: `src/components/timeline/ClipItem.tsx`

- [ ] **B4: Snapping logic**
  - Snap clip edges to other clips (± 0.1s threshold)
  - Snap to playhead position
  - Snap to timeline start (0:00)
  - Visual feedback when snapping occurs
  - File: `src/utils/timelineUtils.ts` (new)

- [ ] **B5: Collision detection**
  - Prevent clips from overlapping on same track
  - Show invalid drop zone feedback
  - Option: Allow overlap with visual warning (for advanced users)
  - Files: `src/components/timeline/TimelineContainer.tsx`

- [ ] **B6: Multi-track support**
  - Add "New Track" button
  - Support video tracks, audio tracks, overlay tracks
  - Render tracks in correct stacking order (top = foreground)
  - Delete track (with confirmation if has clips)
  - Files: `src/components/TimelinePanel.tsx`, `src/components/timeline/TrackHeader.tsx`

- [ ] **B7: Clip selection and context menu**
  - Click to select clip (highlight border)
  - Right-click context menu: Delete, Duplicate, Split
  - Delete key removes selected clip
  - Multi-select (Shift+Click, Ctrl+Click)
  - Files: `src/components/timeline/ClipItem.tsx`, `src/components/timeline/ContextMenu.tsx` (new)

- [ ] **B8: Timeline zoom and scroll**
  - Zoom in/out controls (+ / - buttons, mouse wheel)
  - Update `zoomLevel` (pixels per second)
  - Horizontal scrollbar for long timelines
  - Zoom-to-fit button
  - Files: `src/components/timeline/TimelineContainer.tsx`, `src/components/timeline/ZoomControls.tsx` (new)

**Acceptance Criteria**:
- Clips visible on timeline as colored blocks
- Can drag clips to new positions and tracks
- Can resize clips with handles (trim start/end)
- Clips snap to playhead and other clips
- Cannot create invalid overlaps
- Can add/remove tracks

---

## Section C: Preview Rendering ⭐⭐
**Goal**: Properly render all clip types (video, image, text, map) in preview.
**Dependencies**: Section A (playback foundation)
**Status**: 🟨 Partially implemented

### Tasks

- [ ] **C1: Layer composition**
  - Render clips in correct z-order (track order + clip zIndex)
  - Support multiple simultaneous video tracks
  - Blend modes (if needed)
  - Files: `src/components/PreviewPanel.tsx`

- [ ] **C2: Video clip rendering**
  - Multiple video elements if needed
  - Apply `properties` (position, scale, opacity, rotation)
  - Handle edge case: clip offset beyond video duration
  - Files: `src/components/preview/VideoPlayer.tsx`

- [ ] **C3: Image overlay rendering**
  - Load and cache images
  - Apply transform properties
  - Files: `src/components/preview/OverlayRenderer.tsx`

- [ ] **C4: Text overlay rendering**
  - Render text content as styled div
  - Support basic styling (font, size, color, alignment)
  - Apply position and transform properties
  - Files: `src/components/preview/OverlayRenderer.tsx`

- [ ] **C5: HTML overlay rendering (optional)**
  - Render arbitrary HTML content
  - Sanitize HTML to prevent XSS
  - Apply transform properties
  - Files: `src/components/preview/OverlayRenderer.tsx`

- [ ] **C6: Preview quality settings**
  - Low/Medium/High quality toggle
  - Scale preview resolution for performance
  - Maintain aspect ratio
  - Files: `src/components/PreviewPanel.tsx`, `src/store/slices/projectSlice.ts`

- [ ] **C7: Safe area guides**
  - Toggle-able overlay showing title/action safe areas
  - Grid overlay option
  - Center guides
  - File: `src/components/preview/SafeAreaGuides.tsx` (new)

**Acceptance Criteria**:
- Multiple video tracks render simultaneously
- Overlays (text, images) appear correctly positioned
- Transform properties (position, rotation, opacity) work
- Rendering order respects track order
- Preview quality can be adjusted

---

## Section D: Map & GPX Integration ⭐⭐
**Goal**: Display synchronized map with GPX track in preview and export.
**Dependencies**: Section A (playback), Section C (overlay rendering)
**Status**: 🟨 Partially implemented

### Tasks

- [ ] **D1: GPX coordinate lookup**
  - Implement efficient binary search in `gpxPoints` array
  - Linear interpolation between points
  - Handle edge cases (before start, after end)
  - Files: `src/utils/gpxParser.ts`, `src/utils/mapUtils.ts`

- [ ] **D2: Map overlay component**
  - Create Leaflet map that updates center based on time
  - Render full GPX track as polyline
  - Current position marker (moves with playback)
  - Style track line (color, width)
  - Files: `src/components/preview/MapOverlay.tsx` (new or refactor `src/components/MapPanel.tsx`)

- [ ] **D3: Manual sync interface**
  - UI to align video time with GPX time
  - User selects video frame and corresponding GPS point
  - Calculate and store `syncOffset` on map clip
  - Visual feedback showing alignment
  - Files: `src/components/MapSyncControl.tsx`

- [ ] **D4: Auto-sync (creation time matching)**
  - Extract video creation date from metadata
  - Match with GPX start time automatically
  - Suggest offset to user, allow override
  - Files: `src/services/AssetLoader.ts`, `src/utils/gpxParser.ts`

- [ ] **D5: Map styling options**
  - Choose tile provider (OSM, Mapbox, etc.)
  - Zoom level control
  - Track line color/width
  - Marker icon customization
  - Files: `src/components/MapPanel.tsx`, `src/store/slices/timelineSlice.ts` (add map style to clip properties)

- [ ] **D6: Test map rendering in preview**
  - Verify map updates smoothly during playback
  - Check performance with long GPX tracks
  - Optimize tile loading/caching
  - Files: Multiple

**Acceptance Criteria**:
- GPX track loads and displays on map
- Map center follows current position during playback
- Can manually sync video time to GPS time
- Auto-sync suggests reasonable default
- Map tiles load without blocking playback

---

## Section E: Export Pipeline ⭐⭐⭐
**Goal**: Render final video file (MP4) with all layers composed.
**Dependencies**: Section A (playback), Section C (rendering)
**Status**: 🔴 Scaffolded, untested

### Tasks

- [ ] **E1: Test mediabunny integration**
  - Create minimal test: encode 1-second blank video
  - Verify WebCodecs support in browser
  - Handle browser compatibility errors gracefully
  - Files: `src/services/ExportManager.ts`

- [ ] **E2: Video layer export**
  - Render video clips to canvas frame-by-frame
  - Seek video elements and draw to OffscreenCanvas
  - Apply transform properties during render
  - Handle multiple video tracks
  - Files: `src/services/Compositor.ts`

- [ ] **E3: Overlay export**
  - Render text overlays to canvas (fillText or DOM-to-canvas)
  - Render image overlays
  - Apply transforms correctly
  - Files: `src/services/Compositor.ts`

- [ ] **E4: Map export**
  - Fetch and cache map tiles for GPX path
  - Render map tiles to canvas
  - Draw GPX track polyline
  - Draw position marker
  - Optimize: pre-fetch tiles before export starts
  - Files: `src/services/Compositor.ts`, `src/utils/mapUtils.ts`

- [ ] **E5: Export progress UI**
  - Show modal with progress bar
  - Display current frame / total frames
  - Estimated time remaining
  - Cancel button (abort export)
  - Files: `src/components/ExportModal.tsx`

- [ ] **E6: Export settings**
  - Choose output resolution (720p, 1080p, 4K)
  - Choose framerate (24, 30, 60 fps)
  - Choose codec (H.264, H.265 if supported)
  - Bitrate/quality slider
  - Files: `src/components/ExportModal.tsx`, `src/services/ExportManager.ts`

- [ ] **E7: Download exported file**
  - Generate Blob from mediabunny output
  - Trigger browser download
  - Option: Save to File System Access API if available
  - Show success/error message
  - Files: `src/components/ExportModal.tsx`, `src/services/ExportManager.ts`

- [ ] **E8: Export error handling**
  - Catch and display encoding errors
  - Handle out-of-memory errors
  - Validate project before export (e.g., check for missing assets)
  - Cleanup resources on failure
  - Files: `src/services/ExportManager.ts`

**Acceptance Criteria**:
- Can export simple video clip to MP4
- Exported video matches preview (within reason)
- Overlays render correctly in export
- Map renders correctly in export (if present)
- Progress UI shows accurate feedback
- Export can be cancelled
- Downloaded file plays in VLC/browser

---

## Section F: Project Management ⭐⭐
**Goal**: Save and load projects, undo/redo edits.
**Dependencies**: Section A (basic app working), Section B (editing)
**Status**: 🔴 Not implemented

### Tasks

- [ ] **F1: Project serialization**
  - Convert Zustand store to JSON
  - Handle Blob URLs (save as references or re-encode?)
  - Save to localStorage or IndexedDB
  - Files: `src/utils/projectSerializer.ts` (new), `src/store/slices/projectSlice.ts`

- [ ] **F2: Save project**
  - "Save" button in header
  - Save current project state to browser storage
  - Option: Download as .svp (Strata Vid Project) JSON file
  - File: `src/components/ProjectMenu.tsx` (new)

- [ ] **F3: Load project**
  - "Open" button in header
  - Load from browser storage or uploaded .svp file
  - Restore assets from files or cached Blobs
  - Handle missing assets gracefully
  - Files: `src/components/ProjectMenu.tsx`, `src/utils/projectSerializer.ts`

- [ ] **F4: Undo/Redo system**
  - Implement history stack in Zustand
  - Track mutations that can be undone
  - Undo/Redo buttons in UI
  - Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  - Limit history size (e.g., last 50 actions)
  - Files: `src/store/useProjectStore.ts`, `src/store/middleware/historyMiddleware.ts` (new)

- [ ] **F5: Auto-save**
  - Periodically save to localStorage (every 60s)
  - Visual indicator when auto-saving
  - Option to disable auto-save
  - Files: `src/hooks/useAutoSave.ts` (new)

- [ ] **F6: New/Clear project**
  - "New Project" button
  - Confirm if unsaved changes exist
  - Reset store to initial state
  - Clear all Blob URLs
  - File: `src/components/ProjectMenu.tsx`

**Acceptance Criteria**:
- Can save project and reload it later
- Undo/Redo works for timeline edits
- Auto-save prevents data loss
- Can export project as .svp file
- Can import .svp file from disk

---

## Section G: User Experience ⭐
**Goal**: Polish UI, error handling, loading states, tooltips.
**Dependencies**: Sections A, B (core app functional)
**Status**: 🔴 Minimal implementation

### Tasks

- [ ] **G1: Loading states**
  - Show spinner when loading assets
  - Skeleton UI while project loading
  - Disable buttons during operations
  - Files: Multiple components

- [ ] **G2: Error messages**
  - Toast notifications for errors
  - Graceful degradation when features unsupported (WebCodecs, etc.)
  - User-friendly error messages (not raw stack traces)
  - File: `src/components/Toast.tsx` (new), `src/utils/errorHandler.ts` (new)

- [ ] **G3: Tooltips and help**
  - Tooltip on all buttons (use `title` attribute or library)
  - Help icon linking to docs
  - Keyboard shortcut reference (? key opens modal)
  - Files: `src/components/HelpModal.tsx` (new), `src/components/KeyboardShortcuts.tsx` (new)

- [ ] **G4: Asset thumbnails**
  - Generate thumbnail for video assets (first frame)
  - Show in library panel
  - Show on timeline clips (scaled down)
  - Files: `src/services/AssetLoader.ts`, `src/components/LibraryPanel.tsx`, `src/components/timeline/ClipItem.tsx`

- [ ] **G5: Improved metadata panel**
  - Display all asset properties (duration, resolution, codec, etc.)
  - For GPX: Show distance, elevation, duration
  - For clips: Show transform properties with sliders
  - Editable fields (e.g., adjust clip opacity)
  - Files: `src/components/MetadataPanel.tsx`

- [ ] **G6: Dark/Light mode (optional)**
  - Theme toggle
  - Update Tailwind config for dark mode
  - Store preference in localStorage
  - Files: `src/App.tsx`, tailwind config

- [ ] **G7: Responsive design (optional)**
  - App currently assumes desktop
  - Consider tablet support (hide some panels, simplify UI)
  - Files: Multiple components

- [ ] **G8: Accessibility**
  - Keyboard navigation for all controls
  - ARIA labels on buttons
  - Focus indicators
  - Screen reader support (announce playback state, etc.)
  - Files: Multiple components

**Acceptance Criteria**:
- All async operations show loading state
- Errors display user-friendly messages
- Tooltips on all non-obvious UI elements
- Asset thumbnails visible in library and timeline
- Metadata panel shows comprehensive info
- App is keyboard-accessible

---

## Section H: Advanced Timeline Features ⭐
**Goal**: Transitions, effects, speed ramping, markers.
**Dependencies**: Sections A, B, C (basic editing working)
**Status**: 🔴 Not implemented

### Tasks

- [ ] **H1: Split clip**
  - Right-click clip → Split at playhead
  - Creates two clips from one
  - Maintains all properties
  - Files: `src/store/slices/timelineSlice.ts`, `src/components/timeline/ContextMenu.tsx`

- [ ] **H2: Duplicate clip**
  - Copy clip with all properties
  - Place after original or on clipboard
  - Files: `src/store/slices/timelineSlice.ts`

- [ ] **H3: Ripple delete**
  - Delete clip and shift subsequent clips left
  - Option vs. simple delete (leaves gap)
  - Files: `src/store/slices/timelineSlice.ts`

- [ ] **H4: Crossfade transitions**
  - Add transition between adjacent clips
  - Adjust duration of transition
  - Types: Fade, Dissolve, Wipe
  - Render in preview and export
  - Files: `src/types.ts` (add Transition type), `src/components/preview/*`, `src/services/Compositor.ts`

- [ ] **H5: Speed ramping**
  - Clip property: playbackRate (0.5x, 2x, etc.)
  - Time-remapping curve (ease in/out)
  - Update duration calculation
  - Files: `src/types.ts`, `src/components/preview/VideoPlayer.tsx`, `src/services/Compositor.ts`

- [ ] **H6: Markers**
  - Add markers on timeline (color-coded)
  - Jump to marker
  - Label markers
  - Export markers with project
  - Files: `src/types.ts`, `src/store/slices/timelineSlice.ts`, `src/components/timeline/Marker.tsx` (new)

- [ ] **H7: Video filters/effects**
  - Brightness, Contrast, Saturation
  - Blur, Sharpen
  - Color correction (LUTs?)
  - Apply as clip properties
  - Render using CSS filters in preview, canvas filters in export
  - Files: `src/types.ts`, `src/components/preview/VideoPlayer.tsx`, `src/services/Compositor.ts`

- [ ] **H8: Keyframe animation**
  - Animate clip properties over time (position, scale, opacity)
  - Keyframe editor UI
  - Easing functions
  - Files: `src/types.ts`, `src/components/KeyframeEditor.tsx` (new), rendering logic

**Acceptance Criteria**:
- Can split and duplicate clips
- Crossfade transitions work between clips
- Speed ramping changes playback speed
- Markers help navigate timeline
- Basic filters can be applied

---

## Section I: Audio System ⭐
**Goal**: Audio track support, mixing, volume control.
**Dependencies**: Section A (playback), Section B (timeline)
**Status**: 🔴 Not implemented

### Tasks

- [ ] **I1: Audio asset loading**
  - Load audio files (MP3, WAV, AAC)
  - Extract duration and waveform data
  - Files: `src/services/AssetLoader.ts`

- [ ] **I2: Audio waveform visualization**
  - Display waveform on audio clips in timeline
  - Generate waveform from audio data
  - Files: `src/components/timeline/ClipItem.tsx`, `src/utils/audioUtils.ts` (new)

- [ ] **I3: Audio track rendering**
  - Play audio clips in sync with video
  - Multiple audio tracks (mix)
  - Mute/solo track controls
  - Files: `src/components/preview/AudioPlayer.tsx` (new), `src/hooks/usePlaybackLoop.ts`

- [ ] **I4: Volume control**
  - Per-clip volume (gain)
  - Per-track volume
  - Master volume
  - Volume keyframes (fade in/out)
  - Files: `src/types.ts`, `src/components/preview/AudioPlayer.tsx`, `src/components/VolumeControl.tsx` (new)

- [ ] **I5: Audio export**
  - Mix all audio tracks during export
  - Encode audio to AAC or MP3
  - Sync with video stream in MP4
  - Files: `src/services/ExportManager.ts`, `src/services/Compositor.ts`

- [ ] **I6: Extract audio from video**
  - Option to separate video and audio tracks
  - Allows independent audio editing
  - Files: `src/services/AssetLoader.ts`, `src/store/slices/assetsSlice.ts`

**Acceptance Criteria**:
- Audio files load and display waveform
- Audio plays in sync with video
- Volume controls work per-clip and per-track
- Audio exports correctly mixed with video

---

## Section J: Performance & Optimization ⭐
**Goal**: Optimize for large projects, long videos, many assets.
**Dependencies**: All core sections (A-E)
**Status**: 🔴 Not implemented

### Tasks

- [ ] **J1: Virtual scrolling for timeline**
  - Render only visible tracks/clips
  - Performance with 100+ clips
  - Library: `react-window` or custom
  - Files: `src/components/timeline/TimelineContainer.tsx`

- [ ] **J2: Lazy asset loading**
  - Don't load all assets immediately
  - Load on-demand when clip added to timeline
  - Unload unused assets to free memory
  - Files: `src/services/AssetLoader.ts`, `src/store/slices/assetsSlice.ts`

- [ ] **J3: Web Worker for export**
  - Offload export rendering to Web Worker
  - Keep UI responsive during export
  - Files: `src/workers/exportWorker.ts` (new), `src/services/ExportManager.ts`

- [ ] **J4: Debounce expensive operations**
  - Debounce timeline zoom/scroll
  - Throttle playback time updates
  - Debounce GPX lookups
  - Files: `src/hooks/useDebounce.ts` (new), various components

- [ ] **J5: Memory profiling**
  - Profile memory usage with Chrome DevTools
  - Fix memory leaks (Blob URLs, event listeners)
  - Limit cache sizes (tiles, thumbnails)
  - Files: Multiple

- [ ] **J6: Frame dropping strategy**
  - If preview can't keep up, drop frames gracefully
  - Display warning if performance poor
  - Suggest lowering preview quality
  - Files: `src/hooks/usePlaybackLoop.ts`

**Acceptance Criteria**:
- App handles 50+ clips without lag
- Export doesn't freeze UI
- Memory usage stays reasonable (<500MB for typical project)
- Timeline scrolling is smooth

---

## Section K: Advanced Map Features ⭐
**Goal**: Enhanced map visualizations, multiple tracks, elevation profiles.
**Dependencies**: Section D (basic map integration)
**Status**: 🔴 Not implemented

### Tasks

- [ ] **K1: Multiple GPX tracks**
  - Support multiple GPX overlays simultaneously
  - Different colors for each track
  - Select which track to display
  - Files: `src/components/preview/MapOverlay.tsx`

- [ ] **K2: Elevation profile**
  - Display elevation graph below map
  - Highlight current position on graph
  - Files: `src/components/preview/ElevationProfile.tsx` (new)

- [ ] **K3: Data overlays on video**
  - Display speed, distance, elevation as text overlay
  - Update in real-time during playback
  - Customizable position and styling
  - Files: `src/components/preview/DataOverlay.tsx` (new)

- [ ] **K4: Custom map styles**
  - Support Mapbox styles
  - Dark mode maps, satellite view
  - Allow custom tile URL
  - Files: `src/components/MapPanel.tsx`, `src/utils/mapUtils.ts`

- [ ] **K5: Track simplification**
  - Reduce GPX points for performance (Douglas-Peucker algorithm)
  - Maintain visual fidelity
  - Files: `src/utils/gpxParser.ts`

- [ ] **K6: Heatmap visualization**
  - Show speed or heart rate as heatmap on route
  - Requires additional GPX extensions (heart rate, cadence)
  - Files: `src/components/preview/MapOverlay.tsx`, `src/utils/gpxParser.ts`

**Acceptance Criteria**:
- Multiple GPX tracks can be overlaid
- Elevation profile displays correctly
- Data overlays show current stats
- Custom map styles can be applied

---

## Section L: Collaboration & Cloud ⭐
**Goal**: Share projects, cloud storage, real-time collaboration.
**Dependencies**: Section F (project management)
**Status**: 🔴 Not implemented (future vision)

### Tasks

- [ ] **L1: Export project as shareable link**
  - Upload project JSON to cloud storage (S3, Firebase, etc.)
  - Generate unique URL
  - Load project from URL
  - Files: `src/services/CloudStorage.ts` (new)

- [ ] **L2: Cloud asset storage**
  - Upload video/GPX files to cloud
  - Reference by URL instead of Blob
  - Download on-demand
  - Files: `src/services/CloudStorage.ts`

- [ ] **L3: Real-time collaboration (WebRTC)**
  - Multiple users edit same project simultaneously
  - Operational transform for conflict resolution
  - Show other users' cursors/selections
  - Files: `src/services/Collaboration.ts` (new), WebRTC setup

- [ ] **L4: Comments and annotations**
  - Add comments to timeline at specific times
  - Mention collaborators
  - Resolve comments
  - Files: `src/types.ts`, `src/components/timeline/Comment.tsx` (new)

- [ ] **L5: Version history**
  - Cloud-backed version history
  - Restore previous versions
  - Diff between versions
  - Files: `src/services/CloudStorage.ts`

**Acceptance Criteria**:
- Projects can be shared via link
- Assets can be loaded from cloud URLs
- Real-time collaboration works for 2+ users
- Comments can be added to timeline

---

## Testing Requirements

For each section, write corresponding tests:

### Unit Tests
- Store actions and selectors
- Utility functions (time calculations, GPX parsing, etc.)
- Component logic (isolated with mocks)

### Integration Tests
- Full user flows (load asset → add to timeline → play → export)
- Cross-component interactions
- Playwright for E2E scenarios

### Visual Tests (Optional)
- Snapshot tests for UI components
- Canvas output comparison for export

### Coverage Goals
- Unit tests: >80% coverage
- Integration tests: Critical paths covered
- CI: Run unit tests on every PR, integration tests nightly

---

## Summary: Where to Start

### For MVP (Minimum Viable Product):
1. **Section A** (Playback Foundation) ⭐⭐⭐ - Start here!
2. **Section B** (Timeline Editing) ⭐⭐⭐ - Make it usable
3. **Section C** (Preview Rendering) ⭐⭐ - Polish the preview
4. **Section E** (Export Pipeline) ⭐⭐⭐ - Deliver final video

### For Enhanced Editor:
5. **Section D** (Map & GPX) ⭐⭐ - Your core differentiator
6. **Section F** (Project Management) ⭐⭐ - Don't lose work
7. **Section G** (UX) ⭐ - Make it pleasant to use

### For Advanced Features:
8. **Section H** (Advanced Timeline) ⭐ - Power user features
9. **Section I** (Audio) ⭐ - Complete the experience
10. **Section J** (Performance) ⭐ - Scale up

### For Future:
11. **Section K** (Advanced Map) ⭐ - Unique visualizations
12. **Section L** (Collaboration) ⭐ - Multi-user support

**Parallel Work**: You can work on Sections A+C in parallel, then B, then D+E in parallel.
