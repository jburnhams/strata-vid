# Section M: Audio System 🔊

**Priority**: High
**Goal**: Implement a comprehensive audio system supporting mixing, effects, independent volume controls, and waveform visualization for both audio and video clips.
**Dependencies**: Section C (Preview Engine), Section J (Export)
**Status**: 🟢 Complete

## Overview
The system uses a **Web Audio API** based architecture to provide a central mixer, enabling advanced features like boost, global effects, and export mixing.

## Architecture
- **Engine**: `AudioEngine` (Singleton/Service) managing an `AudioContext`.
- **Mixer Topology**:
  - **Source Nodes**: `MediaElementAudioSourceNode` (Video) / `AudioBufferSourceNode` (Audio Clips).
  - **Clip Gain**: `GainNode` per clip (volume + boost).
  - **Track Gain**: `GainNode` per track (volume + mute).
  - **Master Gain**: `GainNode` (Global volume).
  - **Destination**: `AudioContext.destination` (Speakers) / `MediaStreamAudioDestinationNode` (Export).
- **Export**: Uses `OfflineAudioContext` via `AudioCompositor` to render audio tracks to a buffer.

## Tasks

### Phase 1: Foundation & Data Model
- [x] **M1: Update Data Models**
  - Update `Track` and `Clip` interfaces with volume/mute properties.
  - Files: `src/types.ts`

- [x] **M2: Waveform Extraction for Video**
  - Extend `AssetLoader` to extract audio from video files.
  - Files: `src/services/AssetLoader.ts`, `src/utils/audioUtils.ts`
  - Verified by: `tests/integration/AudioWaveforms.integration.test.tsx`

### Phase 2: Audio Engine & Preview
- [x] **M3: Audio Engine Service**
  - Manage `AudioContext` lifecycle and routing graph.
  - Files: `src/services/AudioEngine.ts`
  - Verified by: `tests/unit/services/AudioEngine.test.ts`, `tests/integration/AudioSystem.integration.test.ts`

- [x] **M4: Video Player Integration**
  - Route video audio through `AudioEngine`.
  - Files: `src/components/preview/VideoPlayer.tsx`
  - Verified by: `tests/integration/AudioPreview.integration.test.tsx`

- [x] **M5: Audio Clip Player**
  - Implement `AudioPlayer` for standalone audio clips.
  - Files: `src/components/preview/AudioPlayer.tsx`
  - Verified by: `tests/unit/components/preview/AudioPlayer.test.tsx`

### Phase 3: UI & Interaction
- [x] **M6: Volume Controls**
  - Add volume/mute controls to Track Header and Metadata Panel.
  - Files: `src/components/MetadataPanel.tsx`, `src/components/timeline/TrackHeader.tsx`
  - Verified by: `tests/integration/AudioControl.integration.test.tsx` (New)

- [x] **M7: Waveform Visualization**
  - Render audio waveforms on timeline clips.
  - Files: `src/components/timeline/WaveformOverlay.tsx`
  - Verified by: `tests/unit/components/timeline/WaveformOverlay.test.tsx`

### Phase 4: Export & Effects
- [x] **M8: Audio Compositor for Export**
  - Render project audio to buffer using `OfflineAudioContext`.
  - Files: `src/services/AudioCompositor.ts`
  - Verified by: `tests/integration/exportWithAudio.integration.test.tsx`

- [ ] **M9: Advanced Effects (Optional)** (Future)
  - Equalizer, Compressor, Reverb nodes.

## Testing Summary
- **Unit Tests**: Full coverage for `AudioEngine`, `AudioPlayer`, and `AudioCompositor`.
- **Integration Tests**:
  - **System**: `AudioSystem.integration.test.ts` verifies the node graph topology.
  - **Wiring**: `AudioPreview.integration.test.tsx` ensures components register with the engine.
  - **UI Interaction**: `AudioControl.integration.test.tsx` verifies that UI controls update the engine state.
  - **Export**: `exportWithAudio.integration.test.tsx` verifies audio is included in the export pipeline.
