# Section G: User Experience ⭐

**Priority**: Medium (polish)
**Goal**: Polish UI, error handling, loading states, tooltips.
**Dependencies**: Sections A, B (core app functional)
**Status**: 🔴 Minimal implementation

## Tasks

- [x] **G1: Loading states** (2-3 hours)
  - Spinner when loading assets
  - Skeleton UI while project loading
  - Disable buttons during operations

- [x] **G2: Error messages** (3-4 hours)
  - Toast notifications for errors
  - Graceful degradation when features unsupported
  - User-friendly error messages
  - Files: `src/components/Toast.tsx` (new), `src/utils/errorHandler.ts` (new)

- [x] **G3: Tooltips and help** (2-3 hours)
  - Tooltip on all buttons
  - Help icon linking to docs
  - Keyboard shortcut reference (? key opens modal)
  - Files: `src/components/HelpModal.tsx` (new)

- [x] **G4: Asset thumbnails** (4-5 hours)
  - Generate thumbnail for videos (first frame)
  - Show in library and timeline
  - Files: `src/services/AssetLoader.ts`, `src/components/LibraryPanel.tsx`

- [x] **G5: Improved metadata panel** (3-4 hours)
  - Display all asset properties
  - For GPX: distance, elevation, duration
  - For clips: transform sliders
  - Editable fields
  - Files: `src/components/MetadataPanel.tsx`

- [ ] **G6: Dark/Light mode** (2-3 hours, optional)
  - Theme toggle
  - Update Tailwind config
  - Store in localStorage

- [ ] **G7: Responsive design** (4-6 hours, optional)
  - Tablet support
  - Simplified mobile UI

- [ ] **G8: Accessibility** (4-6 hours)
  - Keyboard navigation
  - ARIA labels
  - Focus indicators
  - Screen reader support

## Success Criteria
- All async operations show loading state
- Errors display user-friendly messages
- Tooltips on all UI elements
- Asset thumbnails visible
- Metadata panel shows comprehensive info
- App is keyboard-accessible
