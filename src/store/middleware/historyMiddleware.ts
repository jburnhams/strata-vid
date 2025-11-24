import { StateCreator } from 'zustand';
import { StoreState } from '../types';

/**
 * History Middleware for Zustand
 *
 * Implements Undo/Redo functionality by maintaining a stack of past and future states.
 * It wraps the store's `set` function to intercept state changes.
 *
 * Key features:
 * - Snapshots the entire state (except excluded slices) when relevant changes occur.
 * - Limits history size to prevent memory issues.
 * - Excludes high-frequency updates (like playback time) from triggering snapshots,
 *   but includes them in the restored state if they are part of the snapshot.
 *   (Note: Current implementation snapshots everything in the state object).
 */
export const historyMiddleware = (
  config: StateCreator<StoreState, [], [['zustand/immer', never]]>
): StateCreator<StoreState, [], [['zustand/immer', never]]> => {
  return (set, get, api) => {
    const past: StoreState[] = [];
    const future: StoreState[] = [];
    const HISTORY_LIMIT = 50;

    // Flag to prevent recursive history tracking when applying undo/redo
    let isHistoryOperation = false;

    const undo = () => {
      if (past.length === 0) return;

      const previous = past.pop();
      if (previous) {
        // Save current state to future before restoring past
        future.push(get());

        isHistoryOperation = true;
        set(previous);
        isHistoryOperation = false;
      }
    };

    const redo = () => {
      if (future.length === 0) return;

      const next = future.pop();
      if (next) {
        // Save current state to past before restoring future
        past.push(get());

        isHistoryOperation = true;
        set(next);
        isHistoryOperation = false;
      }
    };

    // Attach undo/redo methods to the store API
    // Note: The store type definition must include these methods for TypeScript to recognize them
    (api as any).undo = undo;
    (api as any).redo = redo;

    // Wrapped setter
    const setWithHistory: typeof set = (args, ...rest) => {
        const currentState = get();

        // Apply the update using the original setter (Immer-powered)
        (set as any)(args, ...rest);

        const nextState = get();

        // Only record history if:
        // 1. It's not an undo/redo operation itself
        // 2. Significant state slices have changed
        if (!isHistoryOperation) {
           // We compare top-level references.
           // Since we use Immer, structural sharing ensures that if a slice hasn't changed,
           // its reference remains the same.
           const hasChanged =
             currentState.assets !== nextState.assets ||
             currentState.tracks !== nextState.tracks ||
             currentState.clips !== nextState.clips ||
             currentState.trackOrder !== nextState.trackOrder ||
             currentState.settings !== nextState.settings;

           if (hasChanged) {
             past.push(currentState);

             // Enforce history limit
             if (past.length > HISTORY_LIMIT) {
                 past.shift();
             }

             // Clear redo stack when a new action occurs (branching history)
             future.length = 0;
           }
        }
    };

    return config(setWithHistory, get, api);
  };
};
