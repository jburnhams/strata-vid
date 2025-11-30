# Implementation Roadmap

This roadmap breaks down all implementation tasks into **12 sections** (A-L), organized to enable parallel development.

**How to use this roadmap**:
1. Each section is in a separate file under `docs/sections/`
2. Sections have clear dependencies - you can work on multiple independent sections simultaneously
3. Priority levels guide which sections to focus on first
4. Start with Section A (Playback Foundation) for fastest path to a working MVP

---

## Roadmap Overview

### Organization Principles
- **Sections, not phases**: Tasks grouped by feature area, not sequential phases
- **Clear dependencies**: Each section lists what must be complete before starting
- **Parallel work**: Work on multiple sections at once where dependencies allow
- **Priority levels**: ⭐⭐⭐ (Critical MVP) → ⭐⭐ (Important) → ⭐ (Nice to have)

### Legend
- 🟢 = Ready to start (dependencies met)
- 🟨 = Partially implemented
- 🔴 = Not started
- ⭐⭐⭐ = Critical (MVP required)
- ⭐⭐ = Important (enhances core experience)
- ⭐ = Nice to have (advanced/future features)

---

## MVP Sections (A-E)

Complete these first to achieve a minimum viable product.

### [Section A: Playback Foundation](sections/SECTION_A.md) ⭐⭐⭐
**Status**: 🟢 Complete
**Dependencies**: None - **START HERE!**
**Goal**: Get basic video playback working in the preview panel

**Quick summary**:
- Install dependencies and verify build
- Create transport controls (Play/Pause/Stop)
- Verify video playback works
- Add playhead to timeline
- Sync playhead with preview
- Basic keyboard shortcuts

**Estimated effort**: 15-20 hours

---

### [Section B: Timeline Editing](sections/SECTION_B.md) ⭐⭐⭐
**Status**: 🟨 Partially implemented
**Dependencies**: Section A (need playback to see results)
**Goal**: Make timeline fully interactive - drag, resize, and arrange clips

**Quick summary**:
- Fix clip rendering on timeline
- Implement drag-to-move
- Implement resize handles
- Snapping logic
- Collision detection
- Multi-track support
- Clip selection and context menu
- Timeline zoom and scroll

**Estimated effort**: 25-35 hours

---

### [Section C: Preview Rendering](sections/SECTION_C.md) ⭐⭐
**Status**: 🟢 Complete
**Dependencies**: Section A (playback foundation)
**Goal**: Properly render all clip types (video, image, text, map) in preview

**Quick summary**:
- Layer composition (multiple simultaneous clips)
- Video clip rendering with transforms
- Image overlay rendering
- Text overlay rendering
- HTML overlay rendering (optional)
- Preview quality settings
- Safe area guides (optional)

**Estimated effort**: 15-20 hours

---

### [Section D: Map & GPX Integration](sections/SECTION_D.md) ⭐⭐
**Status**: 🟨 Partially implemented
**Dependencies**: Section A (playback), Section C (overlay rendering)
**Goal**: Display synchronized map with GPX track in preview and export

**Quick summary**:
- GPX coordinate lookup (binary search + interpolation)
- Map overlay component
- Manual sync interface
- Auto-sync (creation time matching)
- Map styling options
- Test map rendering performance

**Estimated effort**: 25-35 hours

---

### [Section E: Export Pipeline](sections/SECTION_E.md) ⭐⭐⭐
**Status**: 🟢 Complete (Implemented & Verified)
**Dependencies**: Section A (playback), Section C (rendering)
**Goal**: Render final video file (MP4) with all layers composed

**Quick summary**:
- Test mediabunny integration (WebCodecs)
- Video layer export
- Overlay export (text, images)
- Map export (HARD - tiles, rendering)
- Export progress UI
- Export settings (resolution, fps, codec, quality)
- Download exported file
- Export error handling

**Estimated effort**: 30-50 hours (map export is challenging)

---

## Enhancement Sections (F-G)

After MVP, these improve the user experience significantly.

### [Section F: Project Management](sections/SECTION_F.md) ⭐⭐
**Status**: 🔴 Not implemented
**Dependencies**: Section A, Section B
**Goal**: Save and load projects, undo/redo edits

**Quick summary**:
- Project serialization (JSON + Blob handling)
- Save project (localStorage, .svp file download)
- Load project (restore from file/storage)
- Undo/Redo system (HARD - history middleware)
- Auto-save (periodic localStorage saves)
- New/Clear project

**Estimated effort**: 20-30 hours

---

### [Section G: User Experience](sections/SECTION_G.md) ⭐
**Status**: 🔴 Minimal implementation
**Dependencies**: Sections A, B
**Goal**: Polish UI, error handling, loading states, tooltips

**Quick summary**:
- Loading states (spinners, skeletons)
- Error messages (toasts, graceful degradation)
- Tooltips and help (keyboard shortcuts reference)
- Asset thumbnails (video first frame)
- Improved metadata panel (editable properties)
- Dark/Light mode (optional)
- Responsive design (optional)
- Accessibility (ARIA, keyboard nav)

**Estimated effort**: 20-30 hours

---

## Advanced Sections (H-L)

These add power-user features and advanced capabilities.

### [Section H: Advanced Timeline Features](sections/SECTION_H.md) ⭐
**Status**: 🔴 Not implemented
**Dependencies**: Sections A, B, C
**Goal**: Transitions, effects, speed ramping, markers

**Features**: Split clip, Duplicate, Ripple delete, Crossfade transitions, Speed ramping, Markers, Video filters/effects, Keyframe animation (HARD)

**Estimated effort**: 50-80 hours

---

### [Section M: Audio System](sections/SECTION_M.md) ⭐
**Status**: 🟢 Complete
**Dependencies**: Section C (Preview Engine), Section J (Export)
**Goal**: Audio track support, mixing, volume control

**Features**: Audio asset loading, Waveform visualization, Audio track rendering, Volume control, Audio export, Extract audio from video

**Estimated effort**: 35-50 hours

---

### [Section J: Performance & Optimization](sections/SECTION_J.md) ⭐
**Status**: 🔴 Not implemented
**Dependencies**: All core sections (A-E)
**Goal**: Optimize for large projects, long videos, many assets

**Features**: Virtual scrolling, Lazy asset loading, Web Worker for export, Debounce operations, Memory profiling, Frame dropping strategy

**Estimated effort**: 25-35 hours

---

### [Section K: Advanced Map Features](sections/SECTION_K.md) ⭐
**Status**: 🔴 Not implemented
**Dependencies**: Section D
**Goal**: Enhanced map visualizations, multiple tracks, elevation profiles

**Features**: Multiple GPX tracks, Elevation profile, Data overlays (speed, distance), Custom map styles, Track simplification, Heatmap visualization

**Estimated effort**: 30-45 hours

---

### [Section L: Collaboration & Cloud](sections/SECTION_L.md) ⭐
**Status**: 🔴 Not implemented
**Dependencies**: Section F
**Goal**: Share projects, cloud storage, real-time collaboration

**Features**: Shareable links, Cloud asset storage, Real-time collaboration (VERY HARD), Comments/annotations, Version history

**Estimated effort**: 60-100+ hours (requires backend infrastructure)

**Note**: This section is highly ambitious and may require significant infrastructure work (server, database, authentication). Consider as long-term vision.

---

## Recommended Development Path

### Phase 1: MVP (Weeks 1-6)
**Goal**: Working video editor with basic playback, editing, and export

1. **Section A** - Playback Foundation ← **START HERE**
2. **Section B** - Timeline Editing
3. **Section C** - Preview Rendering
4. **Section E** - Export Pipeline

**Parallel work**: After completing A, you can work on B and C simultaneously.

**Milestone**: Can load videos, arrange on timeline, play, and export to MP4.

---

### Phase 2: Core Features (Weeks 7-10)
**Goal**: Add GPS sync and project management

5. **Section D** - Map & GPX Integration
6. **Section F** - Project Management

**Milestone**: GPS-synced videos with save/load capability.

---

### Phase 3: Polish (Weeks 11-14)
**Goal**: Improve user experience and reliability

7. **Section G** - User Experience
8. **Section M** - Audio System (or defer to Phase 4)

**Milestone**: Polished, reliable editor with good UX.

---

### Phase 4: Advanced Features (Weeks 15+)
**Goal**: Power-user features and optimizations

9. **Section H** - Advanced Timeline
10. **Section M** - Audio (if not done in Phase 3)
11. **Section J** - Performance
12. **Section K** - Advanced Map

**Milestone**: Professional-grade editor.

---

### Phase 5: Collaboration (Future)
**Goal**: Multi-user and cloud features

13. **Section L** - Collaboration & Cloud

**Milestone**: Cloud-based collaborative editing platform.

---

## Testing Requirements

For each section, write corresponding tests:

### Unit Tests
- Store actions and selectors
- Utility functions (time calculations, GPX parsing, etc.)
- Component logic (isolated with mocks)
- **Target**: >80% coverage (calculated from unit suite only)

### Integration Tests
- Full user flows (load → arrange → play → export)
- Cross-component interactions
- Playwright for E2E scenarios

### Manual Testing
- Each section includes manual testing checklist
- Verify in real browser with actual files
- Test edge cases and error conditions

---

## Dependencies Graph

```
A (Playback) ──────┬──────────┬────────────┬──────────┐
                   │          │            │          │
                   ↓          ↓            ↓          ↓
             B (Timeline)  C (Preview)  F (Project) M (Audio)
                   │          │            │
                   ↓          ↓            │
             H (Advanced)  D (Map)        │
                   │          │            │
                   │          ↓            │
                   │      K (Adv Map)      │
                   │                       │
                   ↓                       ↓
             E (Export) ←──────────────────┤
                   │                       │
                   ↓                       │
             J (Performance)               │
                                           ↓
                                      L (Collaboration)
```

**Key insight**: Sections B, C, F, I can be developed in parallel after A is complete.

---

## Getting Started

1. **Read**:
   - [CURRENT_STATE.md](CURRENT_STATE.md) - Understand what exists now
   - [ARCHITECTURE.md](ARCHITECTURE.md) - Learn the technical design
   - [QUICKSTART.md](QUICKSTART.md) - Set up your environment

2. **Pick a section**: Start with [Section A](sections/SECTION_A.md)

3. **Work through tasks**: Each section has detailed task breakdown

4. **Test as you go**: Write unit tests, manual test, iterate

5. **Track progress**: Check off tasks in section files, update status

---

## Success Criteria

### MVP Complete (Sections A-E)
- ✅ Video loads and plays
- ✅ Timeline is interactive (drag, resize clips)
- ✅ Multi-layer preview works
- ✅ Can export to MP4

### Full Product (Sections A-K)
- ✅ GPS-synced map overlays
- ✅ Project save/load, undo/redo
- ✅ Audio tracks and mixing
- ✅ Advanced editing (transitions, effects)
- ✅ Polished UX, good performance

### Vision (All Sections)
- ✅ Cloud-based collaboration
- ✅ Multi-user real-time editing
- ✅ Professional-grade video editor

---

**Start now**: Open [Section A: Playback Foundation](sections/SECTION_A.md) and begin! 🎬
