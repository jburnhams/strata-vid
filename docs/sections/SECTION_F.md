# Section F: Project Management ⭐⭐

**Priority**: Important (save your work!)
**Goal**: Save and load projects, undo/redo edits.
**Dependencies**: Section A (basic app working), Section B (editing)
**Status**: 🟢 Completed

## Tasks

- [x] **F1: Project serialization** (3-4 hours)
  - Convert Zustand store to JSON
  - Handle Blob URLs (save as data URLs or file references)
  - Save to localStorage or IndexedDB
  - Files: `src/utils/projectSerializer.ts` (new)

- [x] **F2: Save project** (2-3 hours)
  - "Save" button in header
  - Save to browser storage
  - Option: Download as .svp (Strata Vid Project) JSON file
  - Files: `src/components/ProjectMenu.tsx` (new)

- [x] **F3: Load project** (3-4 hours)
  - "Open" button
  - Load from storage or uploaded .svp file
  - Restore assets (re-create Blob URLs from files)
  - Handle missing assets gracefully
  - Files: `src/components/ProjectMenu.tsx`, `src/utils/projectSerializer.ts`

- [x] **F4: Undo/Redo system** (6-8 hours, HARD)
  - Implement history stack in Zustand
  - Track mutations that can be undone
  - Undo/Redo buttons + keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  - Limit history size (last 50 actions)
  - Files: `src/store/middleware/historyMiddleware.ts` (new)

- [x] **F5: Auto-save** (2-3 hours)
  - Save to localStorage every 60s
  - Visual indicator when saving
  - Option to disable
  - Files: `src/hooks/useAutoSave.ts` (new)

- [x] **F6: New/Clear project** (1-2 hours)
  - "New Project" button
  - Confirm if unsaved changes
  - Reset store to initial state
  - Files: `src/components/ProjectMenu.tsx`

## Success Criteria
- Can save and reload projects
- Undo/Redo works for timeline edits
- Auto-save prevents data loss
- Can export/import .svp files

## Testing
- **Unit Tests**:
  - `tests/unit/store/historyMiddleware.test.ts`: Verified undo/redo logic, including history limits and branching.
  - `tests/unit/utils/projectSerializer.test.ts`: Verified JSON serialization/deserialization.
  - `tests/unit/hooks/useAutoSave.test.ts`: Verified auto-save interval and restoration.
  - `tests/unit/components/ProjectMenu.test.tsx`: Verified UI interactions for load/save.

- **Integration Tests**:
  - `tests/integration/undoRedo.integration.test.tsx`: Verified real-world scenario (Clip deletion -> Undo -> Clip restoration).
  - `tests/integration/autoSave.integration.test.tsx`: Verified app state persistence to `localStorage`.
  - `tests/integration/projectManagement.test.tsx`: Verified full Save/Load flow with mock assets.

## Notes
- **History Management**: Implemented `loadProject` action to ensure project loading is atomic and doesn't flood the undo history stack.
- **Asset Restoration**: Currently, loading a project does *not* automatically re-link local files due to browser security constraints. Users must be aware that `src` blobs are lost on reload.
- **Undo/Redo**: Implemented via `historyMiddleware`. Future improvements could exclude more high-frequency updates if needed.
