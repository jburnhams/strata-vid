# Strata Vid - Technical Architecture

## Project Goal

Build a browser-only video editor capable of:
- Stitching multiple video clips into a single timeline
- Overlaying dynamic components (text, HTML, maps with GPX data)
- Real-time preview with synchronized playback
- Exporting final rendered video as MP4

All processing happens **client-side** - no server required.

## Technology Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| Framework | React 19 | UI components and rendering |
| Build Tool | Vite | Fast development and optimized builds |
| Language | TypeScript | Type safety and developer experience |
| Styling | Tailwind CSS v4 | Utility-first styling |
| State | Zustand + Immer | Lightweight, performant state management |
| Media | mediabunny | Browser-native video I/O and encoding (WebCodecs) |
| Maps | Leaflet + react-leaflet | Interactive map rendering |
| GPX | @we-gold/gpxjs | GPX file parsing |
| Timeline UI | @dnd-kit | Drag-and-drop interactions |
| Icons | lucide-react | UI icons |
| Testing | Jest + Playwright | Unit and integration tests |

## Core Concepts

### 1. Browser-First Architecture
- All video processing happens in the browser using WebCodecs API (via mediabunny)
- No server dependencies for video rendering
- Assets loaded as Blob URLs
- Export generates file client-side for download

### 2. Dual-Engine System

#### Playback Engine (DOM-based)
- **Purpose**: Real-time preview with responsive UI
- **Implementation**: HTML5 `<video>` elements + CSS-positioned overlays
- **Performance**: Leverages browser's hardware-accelerated video decoding
- **Limitation**: What you see may not be pixel-perfect with final export

#### Export Engine (Canvas-based)
- **Purpose**: Frame-by-frame rendering for final output
- **Implementation**: OffscreenCanvas + WebCodecs via mediabunny
- **Accuracy**: Pixel-perfect, matches export exactly
- **Limitation**: Cannot run in real-time, slower than playback speed

### 3. Single Source of Truth
The Zustand store represents the complete project state (Edit Decision List):
- **Project Settings**: Resolution, FPS, duration
- **Assets**: Source files (videos, GPX, images)
- **Tracks**: Timeline layers (video, audio, overlay)
- **Clips**: References to assets positioned on tracks
- **Playback State**: Current time, play/pause, rate

All mutations go through store actions to maintain consistency.

## Data Model

### Entity Relationships

```
Project
├── settings (resolution, fps, duration)
├── assets: Record<id, Asset>
│   └── Asset (video, gpx, image, audio)
├── tracks: Record<id, Track>
│   └── Track
│       └── clips: string[] (clip IDs)
├── clips: Record<id, Clip>
│   └── Clip (references assetId and trackId)
└── playback (currentTime, isPlaying, playbackRate)
```

### Key Types

```typescript
interface Asset {
  id: string;
  name: string;
  type: 'video' | 'gpx' | 'image' | 'audio';
  src: string; // Blob URL
  duration?: number; // For video/audio
  resolution?: { width: number; height: number };
  gpxPoints?: GpxPoint[]; // For GPX assets
  stats?: GpxStats; // GPX statistics
}

interface Track {
  id: string;
  type: 'video' | 'audio' | 'overlay';
  label: string;
  isMuted: boolean;
  isLocked: boolean;
  clips: string[]; // Ordered array of clip IDs
}

interface Clip {
  id: string;
  assetId: string; // Which asset to use
  trackId: string; // Which track it belongs to
  start: number; // Timeline position (seconds)
  duration: number; // How long to play (seconds)
  offset: number; // Trim start in source (seconds)
  type: 'video' | 'image' | 'map' | 'text' | 'html';
  properties: OverlayProperties; // Position, scale, opacity, etc.
  content?: string; // For text/html clips
  syncOffset?: number; // For map clips: GPX time offset
}

interface OverlayProperties {
  x: number; // % of canvas width
  y: number; // % of canvas height
  width: number; // % of canvas width
  height: number; // % of canvas height
  rotation: number; // degrees
  opacity: number; // 0-1
  zIndex: number; // Stacking order
}
```

## GPX Synchronization Logic

### Time Mapping
```
Video Time (t) -> GPX Time
gpxTime = (t - clip.start) + clip.syncOffset
```

### Sync Methods

1. **Automatic**: Match video creation time to GPX timestamps
   ```
   offset = video.creationDate - gpx.startTime
   ```

2. **Manual**: User selects corresponding points
   ```
   offset = gpxPointTime - videoTime
   ```

### Coordinate Lookup
- GPX points stored as `{ time, lat, lon, ele }[]`
- Binary search to find surrounding points
- Linear interpolation for smooth movement
- Map center updates every frame during playback

## Rendering Pipeline

### Playback (Real-time)
```
requestAnimationFrame loop
  ↓
Update store.currentTime
  ↓
Calculate active clips (start ≤ t < start+duration)
  ↓
For each active clip:
  - Video: Render <video> element, seek to (t - clip.start + clip.offset)
  - Overlay: Render <div> with transform based on properties
  - Map: Update center based on GPX position at t
```

### Export (Frame-by-frame)
```
For each frame (0 to duration * fps):
  t = frame / fps
  ↓
  Calculate active clips at time t
  ↓
  Clear OffscreenCanvas
  ↓
  For each active clip (bottom to top):
    - Video: Seek video element, drawImage(video) to canvas
    - Image: drawImage() to canvas
    - Text: fillText() or render HTML to canvas
    - Map: Fetch tiles, draw polyline, draw marker
  ↓
  Encode frame using mediabunny (WebCodecs)
  ↓
Finalize output, generate MP4 Blob
```

## Module Organization

```
src/
├── components/           # React components
│   ├── LibraryPanel.tsx
│   ├── PreviewPanel.tsx
│   ├── MetadataPanel.tsx
│   ├── TimelinePanel.tsx
│   ├── ExportModal.tsx
│   ├── preview/          # Preview engine components
│   │   ├── VideoPlayer.tsx
│   │   └── OverlayRenderer.tsx
│   └── timeline/         # Timeline UI components
│       ├── TimelineContainer.tsx
│       ├── TrackLane.tsx
│       ├── TrackHeader.tsx
│       ├── ClipItem.tsx
│       └── Ruler.tsx
├── store/                # Zustand state management
│   ├── useProjectStore.ts
│   ├── types.ts
│   └── slices/
│       ├── projectSlice.ts
│       ├── assetsSlice.ts
│       ├── timelineSlice.ts
│       └── playbackSlice.ts
├── services/             # Business logic
│   ├── AssetLoader.ts    # Load and parse assets
│   ├── Compositor.ts     # Render frames to canvas
│   └── ExportManager.ts  # Export orchestration
├── hooks/                # Custom React hooks
│   └── usePlaybackLoop.ts
├── utils/                # Pure functions
│   ├── gpxParser.ts
│   └── mapUtils.ts
├── types.ts              # Shared type definitions
└── App.tsx               # Root component
```

## Testing Strategy

### Unit Tests (`tests/unit/`)
- Store slices and actions
- Pure utility functions (GPX parsing, time calculations)
- Individual component logic
- Mock mediabunny and leaflet

### Integration Tests (`tests/integration/`)
- Full asset loading flow
- Timeline interactions (drag, resize)
- Playback synchronization
- Export pipeline (with small test videos)

### Coverage Requirements
- Unit tests must achieve >80% coverage
- Calculated from unit suite only
- GitHub Actions enforces this

## Performance Considerations

### Playback
- Only render active clips at current time
- Use `requestAnimationFrame` for smooth updates
- Debounce expensive operations (GPX lookups)
- Lazy-load map tiles

### Export
- Use OffscreenCanvas for off-main-thread rendering
- Batch frame encoding where possible
- Show progress feedback (cancel button)
- Clear caches after export

### Memory
- Release Blob URLs when assets removed
- Limit tile cache size for maps
- Clean up video elements after export

## Browser Compatibility

**Required APIs**:
- WebCodecs (Chrome 94+, Edge 94+)
- OffscreenCanvas (Chrome 69+, Firefox 105+)
- File System Access API (optional, for save/load)

**Target**: Modern Chrome/Edge/Brave. Firefox support possible but untested.

## Future Considerations

- **Audio Mixing**: Currently only video tracks fully supported
- **Transitions**: Crossfades, wipes between clips
- **Effects**: Filters, color grading, speed ramping
- **Multi-layer Overlays**: Text, graphics, multiple maps
- **Collaborative Editing**: WebRTC for real-time collaboration
- **Cloud Assets**: Load from URLs, not just local files
