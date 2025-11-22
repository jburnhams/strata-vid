# Strata Vid - Technical Overview

## 1. Project Goal
To build a browser-only video editor capable of stitching multiple video clips, overlaying dynamic components (text, HTML, maps), and synchronizing GPX data with video playback. The application must support both real-time playback in the browser and exporting a final rendered video file (e.g., MP4).

## 2. Core Architecture

### 2.1. Technology Stack
- **Framework**: React 19 (via Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand (chosen for simplicity and performance with complex nested objects)
- **Media Processing**: `mediabunny` (High-performance, browser-native media I/O and transcoding)
- **Maps**: `react-leaflet` / `leaflet`
- **GPX Parsing**: `@we-gold/gpxjs`
- **Icons**: `lucide-react`
- **Testing**: Jest (Unit), Playwright (Integration/E2E)

### 2.2. Key Concepts
- **Browser-First**: All processing happens client-side. No server-side rendering of video.
- **Project State**: A single source of truth (Zustand store) representing the "Edit Decision List" (EDL).
- **Dual-Engine**:
  - **Playback Engine**: Uses HTML5 Video and DOM overlays for responsive preview.
  - **Export Engine**: Uses `mediabunny` and `Canvas` APIs to frame-by-frame render and encode the final output.

## 3. Data Model
The application state is hierarchical:
```typescript
interface Project {
  id: string;
  settings: {
    width: number;
    height: number;
    fps: number;
  };
  assets: Asset[]; // Raw source files (Videos, GPX, Images)
  tracks: Track[]; // Timeline layers
}

interface Track {
  id: string;
  type: 'video' | 'audio' | 'overlay';
  clips: Clip[];
  isMuted: boolean;
  isLocked: boolean;
}

interface Clip {
  id: string;
  assetId: string;
  timelineStart: number; // Where it appears on timeline (seconds)
  inPoint: number; // Start trimming (seconds)
  outPoint: number; // End trimming (seconds)
  properties: {
    position: { x: number, y: number };
    scale: number;
    opacity: number;
    // ... other transform props
  };
}

interface Overlay extends Clip {
  type: 'text' | 'html' | 'map';
  content: string; // Text content or HTML string
  style: CSSProperties;
}
```

## 4. Synchronization Logic
- **Video Time**: The master clock.
- **GPX Time**: Derived from Video Time.
  - *Auto-Sync*: Video CreationDate + Video Time = Real World Time. Match with GPX timestamps.
  - *Manual Sync*: User defines an offset (e.g., "Video 00:00 = GPX 10:30:00").
- **Map Update**: On every frame/time-update, the map center updates to the coordinate corresponding to the current calculated GPX time.

## 5. Testing Strategy
- **Unit Tests**: Extensive use of Jest with mocks for `mediabunny` and `leaflet`. Focus on logic (reducers, sync math, parser).
- **Integration Tests**: Playwright tests ensuring the UI responds to user input (drag-and-drop, timeline scrubbing).
- **Visual Tests**: Verification of canvas rendering outputs (basic pixel matching for export logic).
