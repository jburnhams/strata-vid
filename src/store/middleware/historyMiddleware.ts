import { StateCreator } from 'zustand';
import { StoreState } from '../types';

export const historyMiddleware = (
  config: StateCreator<StoreState, [], [['zustand/immer', never]]>
): StateCreator<StoreState, [], [['zustand/immer', never]]> => {
  return (set, get, api) => {
    const past: StoreState[] = [];
    const future: StoreState[] = [];
    let isHistoryOperation = false;

    const undo = () => {
      if (past.length === 0) return;
      const previous = past.pop();
      if (previous) {
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
        past.push(get());
        isHistoryOperation = true;
        set(next);
        isHistoryOperation = false;
      }
    };

    // Attach to store instance
    (api as any).undo = undo;
    (api as any).redo = redo;

    const setWithHistory: typeof set = (args, ...rest) => {
        const currentState = get();

        // Apply the update
        (set as any)(args, ...rest);

        const nextState = get();

        if (!isHistoryOperation) {
           // Check for relevant changes
           // We compare top-level references. Since we use immer,
           // strict equality check works for detecting changes.
           if (
             currentState.assets !== nextState.assets ||
             currentState.tracks !== nextState.tracks ||
             currentState.clips !== nextState.clips ||
             currentState.trackOrder !== nextState.trackOrder ||
             currentState.settings !== nextState.settings
           ) {
             past.push(currentState);
             if (past.length > 50) past.shift();
             future.length = 0;
           }
        }
    };

    return config(setWithHistory, get, api);
  };
};
