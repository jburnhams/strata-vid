# Section M: Audio System 🔊

**Priority**: High
**Goal**: Implement a comprehensive audio system supporting mixing, effects, independent volume controls, and waveform visualization for both audio and video clips.
**Dependencies**: Section C (Preview Engine), Section J (Export)
**Status**: 🔴 Not implemented

## Overview
The current system uses HTMLMediaElement's native audio playback for video clips and lacks a dedicated audio engine. This section introduces a **Web Audio API** based architecture to provide a central mixer, enabling advanced features like boost, global effects, and export mixing.

## Architecture
- **Engine**: `AudioEngine` (Singleton/Service) managing an `AudioContext`.
- **Mixer Topology**:
  - **Source Nodes**: `MediaElementAudioSourceNode` (Video) / `AudioBufferSourceNode` (Audio Clips).
  - **Clip Gain**: `GainNode` per clip (volume + boost).
  - **Track Gain**: `GainNode` per track (volume + mute).
  - **Master Gain**: `GainNode` (Global volume).
  - **Destination**: `AudioContext.destination` (Speakers) / `MediaStreamAudioDestinationNode` (Export).
- **Export**: Uses `OfflineAudioContext` or `AudioCompositor` to render audio tracks to a buffer, separate from the visual frame loop.

## Tasks

### Phase 1: Foundation & Data Model
- [x] **M1: Update Data Models** (2-3 hours)
  - Update `Track` interface: Add `volume: number` (default 1.0).
  - Update `Clip` interface: Add `volume: number` (default 1.0).
  - Update `Asset` interface: Ensure `waveform` is available for both `audio` and `video` types.
  - Files: `src/types.ts`

- [x] **M2: Waveform Extraction for Video** (4-6 hours)
  - Extend `AssetLoader` to extract audio from video files.
  - Use `AudioContext.decodeAudioData` or `mediabunny` fallback to get `AudioBuffer`.
  - Generate waveform peaks for `Asset.waveform`.
  - Files: `src/services/AssetLoader.ts`, `src/utils/audioUtils.ts`

### Phase 2: Audio Engine & Preview
- [ ] **M3: Audio Engine Service** (12-16 hours)
  - Create `src/services/AudioEngine.ts`.
  - Manage `AudioContext` lifecycle.
  - Methods: `registerClip(clipId, element?)`, `unregisterClip(clipId)`, `updateVolume(id, vol)`.
  - Implement node graph: `Source -> ClipGain -> TrackGain -> MasterGain -> Dest`.
  - Handle `isMuted` on tracks.

- [ ] **M4: Video Player Integration** (4-6 hours)
  - Modify `VideoPlayer.tsx`:
    - Set `<video>` to `muted={false}` but remove it from DOM output (or keep muted in DOM and route via `captureStream` or `MediaElementAudioSourceNode`? *Note: `MediaElementAudioSourceNode` is safer for sync*).
    - **Wait**: `MediaElementAudioSourceNode` takes the element. The element must play. If we mute the element, the node might be silent (browser dependent). Better approach: Keep element playing, disconnected from default destination, connected to `AudioEngine`.
    - Register ref with `AudioEngine` on mount.
  - Files: `src/components/preview/VideoPlayer.tsx`

- [ ] **M5: Audio Clip Player** (6-8 hours)
  - Create `AudioPlayer.tsx` (headless component) or manage entirely within `AudioEngine` via `usePlaybackLoop`.
  - Since standard `AudioPlayer` is missing, implement it using `AudioBufferSourceNode` for precise timing or `<audio>` element for streaming.
  - *Recommendation*: Use `AudioBufferSourceNode` for short clips/SFX, `<audio>` for long tracks, or just `<audio>` for all for consistency with Video.

### Phase 3: UI & Interaction
- [ ] **M6: Volume Controls** (4-6 hours)
  - Add Number Input for Volume to `MetadataPanel` (allow > 100% for boost).
  - Add Volume Slider/Input to Track Headers in `TimelinePanel`.
  - Files: `src/components/MetadataPanel.tsx`, `src/components/timeline/TrackHeader.tsx`

- [ ] **M7: Waveform Visualization** (8-12 hours)
  - Create `WaveformOverlay` component.
  - Render on `ClipItem`.
  - For Video: Semi-transparent overlay over the thumbnail strip.
  - For Audio: Main representation.
  - Files: `src/components/timeline/ClipItem.tsx`, `src/components/timeline/WaveformOverlay.tsx` (new)

### Phase 4: Export & Effects
- [ ] **M8: Audio Compositor for Export** (12-16 hours)
  - Create `src/services/AudioCompositor.ts`.
  - Use `OfflineAudioContext`.
  - Load all audio assets as buffers (decode upfront or chunked).
  - Render mix to `AudioBuffer`.
  - Encode to AAC/MP3 (using `mediabunny` or `ffmpeg.wasm` if needed, or `MediaRecorder` API workaround if offline context isn't enough).
  - Integrate with `ExportManager`.

- [ ] **M9: Advanced Effects (Optional)** (Future)
  - Equalizer, Compressor, Reverb nodes.
  - VST-like plugin support structure.

## Integration Testing Strategy
- **Node Support**: Use `web-audio-test-api` or similar mock for `AudioContext` in Jest/Node environment.
- **Integration Tests**:
  - Verify routing: `Clip -> Track -> Master`.
  - Verify Volume math (Clip=0.5 * Track=0.5 = 0.25).
  - Verify Mute toggle.
  - Verify Boost (>1.0 gain).

## Technical Considerations
- **CORS**: `MediaElementAudioSourceNode` requires `crossOrigin="anonymous"` on video/audio elements.
- **Sync**: Web Audio API clock is different from `performance.now()`. Sync logic in `VideoPlayer` needs to align visual frame with audio time.
- **Memory**: Decoding large video files to `AudioBuffer` for waveform/export can be heavy. Consider "lazy" decoding or peaks-only extraction.
