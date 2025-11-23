# Section F: Project Management ⭐⭐

**Priority**: Important (save your work!)
**Goal**: Save and load projects, undo/redo edits.
**Dependencies**: Section A (basic app working), Section B (editing)
**Status**: 🔴 Not implemented

## Tasks

- [ ] **F1: Project serialization** (3-4 hours)
  - Convert Zustand store to JSON
  - Handle Blob URLs (save as data URLs or file references)
  - Save to localStorage or IndexedDB
  - Files: `src/utils/projectSerializer.ts` (new)

- [ ] **F2: Save project** (2-3 hours)
  - "Save" button in header
  - Save to browser storage
  - Option: Download as .svp (Strata Vid Project) JSON file
  - Files: `src/components/ProjectMenu.tsx` (new)

- [ ] **F3: Load project** (3-4 hours)
  - "Open" button
  - Load from storage or uploaded .svp file
  - Restore assets (re-create Blob URLs from files)
  - Handle missing assets gracefully
  - Files: `src/components/ProjectMenu.tsx`, `src/utils/projectSerializer.ts`

- [ ] **F4: Undo/Redo system** (6-8 hours, HARD)
  - Implement history stack in Zustand
  - Track mutations that can be undone
  - Undo/Redo buttons + keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  - Limit history size (last 50 actions)
  - Files: `src/store/middleware/historyMiddleware.ts` (new)

- [ ] **F5: Auto-save** (2-3 hours)
  - Save to localStorage every 60s
  - Visual indicator when saving
  - Option to disable
  - Files: `src/hooks/useAutoSave.ts` (new)

- [ ] **F6: New/Clear project** (1-2 hours)
  - "New Project" button
  - Confirm if unsaved changes
  - Reset store to initial state
  - Files: `src/components/ProjectMenu.tsx`

## Success Criteria
- Can save and reload projects
- Undo/Redo works for timeline edits
- Auto-save prevents data loss
- Can export/import .svp files
