# Section I: Audio System ⭐

**Priority**: Medium (complete the experience)
**Goal**: Audio track support, mixing, volume control.
**Dependencies**: Section A (playback), Section B (timeline)
**Status**: 🔴 Not implemented

## Tasks

- [ ] **I1: Audio asset loading** (2-3 hours)
  - Load MP3, WAV, AAC files
  - Extract duration and waveform data
  - Files: `src/services/AssetLoader.ts`

- [ ] **I2: Audio waveform visualization** (6-8 hours)
  - Display waveform on audio clips
  - Generate from audio data (Web Audio API)
  - Files: `src/components/timeline/ClipItem.tsx`, `src/utils/audioUtils.ts` (new)

- [ ] **I3: Audio track rendering** (6-8 hours)
  - Play audio clips in sync with video
  - Multiple audio tracks (mix)
  - Mute/solo controls
  - Files: `src/components/preview/AudioPlayer.tsx` (new), `src/hooks/usePlaybackLoop.ts`

- [ ] **I4: Volume control** (4-5 hours)
  - Per-clip volume (gain)
  - Per-track volume
  - Master volume
  - Volume keyframes (fade in/out)
  - Files: `src/types.ts`, `src/components/VolumeControl.tsx` (new)

- [ ] **I5: Audio export** (8-10 hours)
  - Mix all audio tracks during export
  - Encode to AAC or MP3
  - Sync with video stream
  - Files: `src/services/ExportManager.ts`

- [ ] **I6: Extract audio from video** (3-4 hours)
  - Separate video and audio tracks
  - Independent audio editing
  - Files: `src/services/AssetLoader.ts`

## Success Criteria
- Audio files load and show waveform
- Audio plays in sync with video
- Volume controls work
- Audio exports correctly mixed
