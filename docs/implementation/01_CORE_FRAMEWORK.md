# Section 01: Core Framework & State

## Goal
Establish the foundational data structures, state management, and asset ingestion pipeline. This is the prerequisite for all other sections.

## Data Structures (`src/types`)
Extend the existing types to support the full multi-track editing model.

```typescript
// Proposed additions
export interface Track {
  id: string;
  type: 'video' | 'audio' | 'overlay';
  label: string;
  isMuted: boolean;
  isLocked: boolean;
  clips: string[]; // Array of Clip IDs
}

export interface OverlayProperties {
  x: number; // % of screen width
  y: number; // % of screen height
  width: number; // % of screen width
  height: number; // % of screen height
  rotation: number; // degrees
  opacity: number; // 0-1
  zIndex: number;
}

export interface Clip {
  id: string;
  assetId: string;
  trackId: string;
  start: number; // Global timeline start (seconds)
  duration: number; // Playback duration (seconds)
  offset: number; // Source media start time (trimming)
  properties: OverlayProperties;
  type: 'video' | 'image' | 'map' | 'text' | 'html';
  content?: string; // For text/html
}
```

## State Management (`src/store`)
Use `zustand` with `immer` middleware for immutable updates.

### Store Slices
1.  **ProjectSlice**: Metadata (resolution, fps, duration).
2.  **AssetsSlice**: Map of `id -> Asset`. Actions: `addAsset`, `removeAsset`.
3.  **TimelineSlice**: Map of `id -> Track`, `id -> Clip`. Actions: `moveClip`, `resizeClip`, `addTrack`.
4.  **PlaybackSlice**: `currentTime`, `isPlaying`, `playbackRate`.

## Asset Ingestion
- Create `src/services/AssetLoader.ts`.
- Function `loadAsset(file: File): Promise<Asset>`.
- For Videos: Extract metadata (duration, resolution) using `mediabunny` or standard `<video>` tag loading.
- For GPX: Use `gpxParser` (existing) to extract stats and track points.

## Tasks
1.  [ ] **Refactor Types**: Update `src/types.ts` with new interfaces.
2.  [ ] **Setup Store**: Create `src/store/useProjectStore.ts`.
3.  [ ] **Asset Service**: Implement `loadAsset` logic.
4.  [ ] **Tests**: Write unit tests for the store actions (adding clips, checking overlaps).

## Testing
- **Unit**: Test `AssetLoader` with mock Files. Test Store reducers to ensure data consistency (e.g., deleting a track deletes its clips).
