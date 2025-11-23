# Section 01: Core Framework & State

## Goal
Establish the foundational data structures, state management, and asset ingestion pipeline. This is the prerequisite for all other sections.

## Data Structures (`src/types`)
Extended the existing types to support the full multi-track editing model.

```typescript
// Implemented additions
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
Uses `zustand` with `immer` middleware for immutable updates.

### Store Slices
1.  **ProjectSlice**: Metadata (resolution, fps, duration).
2.  **AssetsSlice**: Map of `id -> Asset`. Actions: `addAsset`, `removeAsset`.
3.  **TimelineSlice**: Map of `id -> Track`, `id -> Clip`. Actions: `moveClip`, `resizeClip`, `addTrack`.
4.  **PlaybackSlice**: `currentTime`, `isPlaying`, `playbackRate`.

## Asset Ingestion
- Created `src/services/AssetLoader.ts`.
- Function `loadAsset(file: File): Promise<Asset>`.
- For Videos: Extract metadata (duration, resolution) using `mediabunny`.
- For GPX: Uses `gpxParser` (with `@we-gold/gpxjs`) to extract stats and track points manually.

## Tasks
1.  [x] **Refactor Types**: Update `src/types.ts` with new interfaces.
2.  [x] **Setup Store**: Create `src/store/useProjectStore.ts`.
    - Implemented slices for Project, Assets, Timeline, Playback.
    - Implemented Actions: `addTrack`, `addClip`, `moveClip`, `resizeClip`, `addAsset`, `removeAsset`.
3.  [x] **Asset Service**: Implement `loadAsset` logic.
    - Integrated `mediabunny` for video metadata.
    - Integrated `gpxParser` for GPX stats.
4.  [x] **Tests**: Write unit tests for the store actions (adding clips, checking overlaps).
    - `tests/unit/store/timelineSlice.test.ts` covers all timeline actions.
    - `tests/unit/store/useProjectStore.test.ts` covers overall store integration.
    - `tests/integration/flow.test.ts` covers end-to-end asset loading and state update.

## Testing
- **Unit**: Tests passing for `AssetLoader`, `Store` (Slices and Integration), `gpxParser`, and UI Panels (`LibraryPanel`, `MetadataPanel`, `TimelinePanel`, `PreviewPanel`).
- **Integration**: `tests/integration/flow.test.ts` verifies the flow from `AssetLoader` to `Store`.

## Implementation Notes
- **State Normalization**: The Store uses a normalized structure (Maps/Records) for `assets`, `tracks`, and `clips`. `App.tsx` was updated to convert these to arrays for UI consumption where necessary.
- **GPX Parsing**: Manual calculation of GPX stats is implemented in `src/utils/gpxParser.ts` to ensure accuracy.
- **Mediabunny**: Integrated for metadata extraction; verified via tests with mocks.
- **Robustness**: Added checks in `timelineSlice` (e.g., `addClip`) to ensure referential integrity (tracks must exist).
- **Extended Testing**: Added edge case unit tests for timeline operations and a comprehensive full-flow integration test.
