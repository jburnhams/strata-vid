/**
 * The project's undo history: strata-react's `useHistory` (issue #81) fed by the store's document
 * recorder (`historyMiddleware`). Each change to the document becomes a named step ("Undo trim clip")
 * that puts the snapshot before it back; changes from one slider or field merge into one step;
 * opening or starting a project clears the history. `history.commands` are the Undo and Redo the keys,
 * the Edit menu and the command menu share, disabled with a reason when there is nothing to undo.
 */
import { useEffect, useRef } from 'react';
import { useHistory, type History } from 'strata-react';
import { useProjectStore } from '../store/useProjectStore';
import { nameChange } from '../utils/historyLabels';

/** Steps kept, as before the swap. */
export const HISTORY_LIMIT = 50;

export function useDocumentHistory(): History {
  const history = useHistory({ limit: HISTORY_LIMIT });
  const latest = useRef(history);
  latest.current = history;

  useEffect(() => {
    const store = useProjectStore;
    return store.recordDocument((change) => {
      if (change.type === 'reset') {
        latest.current.clear();
        return;
      }
      const name = nameChange(change.before, change.after);
      if (!name) return;
      const { before, after } = change;
      latest.current.push({
        label: name.label,
        key: name.key,
        undo: () => store.restoreDocument(before),
        redo: () => store.restoreDocument(after),
      });
    });
  }, []);

  return history;
}
