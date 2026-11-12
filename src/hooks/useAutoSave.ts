/**
 * Keeps the project in `localStorage` and says so: strata-react's `useAutoSave` (issue #81) saves a
 * second and a half after the document stops changing (it was every 60 seconds, so up to a minute of
 * work could be lost), never two saves at once, and its state drives `SaveStatus` in the header. A
 * save that fails (storage full, or blocked) shows "Not saved" with the reason and Try again instead of
 * failing silently. On opening, an empty editor restores the last auto-save, as before.
 *
 * The files themselves are not stored; a restored project shows each one as missing until relinked.
 */
import { useEffect } from 'react';
import { useAutoSave as useStrataAutoSave, useLeaveGuard, type AutoSave } from 'strata-react';
import { useShallow } from 'zustand/react/shallow';
import { useProjectStore } from '../store/useProjectStore';
import { snapshotOf, type DocumentSnapshot } from '../store/middleware/historyMiddleware';
import { serializeProject, deserializeProject } from '../utils/projectSerializer';

export const AUTO_SAVE_KEY = 'strata_vid_autosave';
export const AUTO_SAVE_DELAY_MS = 1500;

const sameDocument = (a: DocumentSnapshot, b: DocumentSnapshot) =>
  a.assets === b.assets && a.tracks === b.tracks && a.clips === b.clips && a.trackOrder === b.trackOrder &&
  a.settings === b.settings && a.markers === b.markers;

const isEmpty = (doc: DocumentSnapshot) => Object.keys(doc.assets).length === 0 && Object.keys(doc.tracks).length === 0;

export function useAutoSave(): AutoSave {
  // Restore once, before the first save can overwrite what is stored.
  useEffect(() => {
    const saved = localStorage.getItem(AUTO_SAVE_KEY);
    if (!saved) return;
    try {
      const state = deserializeProject(saved);
      if (state && isEmpty(snapshotOf(useProjectStore.getState()))) {
        useProjectStore.getState().loadProject(state);
      }
    } catch (e) {
      console.warn('Failed to restore auto-save', e);
    }
  }, []);

  const document = useProjectStore(useShallow(snapshotOf));

  const autoSave = useStrataAutoSave<DocumentSnapshot>({
    value: document,
    equals: sameDocument,
    delayMs: AUTO_SAVE_DELAY_MS,
    save: () => {
      const state = useProjectStore.getState();
      try {
        // A new, empty project leaves nothing to restore.
        if (isEmpty(snapshotOf(state))) localStorage.removeItem(AUTO_SAVE_KEY);
        else localStorage.setItem(AUTO_SAVE_KEY, serializeProject(state));
      } catch (e) {
        throw new Error(e instanceof DOMException && e.name === 'QuotaExceededError'
          ? 'The browser’s storage for this site is full.'
          : 'The browser refused to store the project.');
      }
    },
  });

  // Closing the tab while a change is not yet stored loses it.
  useLeaveGuard(autoSave.state.status === 'dirty' || autoSave.state.status === 'saving' || autoSave.state.status === 'failed');

  return autoSave;
}
