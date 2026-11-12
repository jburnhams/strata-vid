import type { StateCreator } from 'zustand';
import type { StoreState } from '../types';

/**
 * Records changes to the document for strata-react's `useHistory` (issue #81), which owns the steps,
 * their names, grouping and the Undo and Redo commands. The store only says what changed: each set
 * that changes a document slice is reported as a (before, after) pair of those slices, and
 * `restoreDocument` puts a pair's side back. Playback, selection and UI state are never part of a
 * step, so undo does not move the playhead. Opening or starting a project reports a reset, which
 * clears the history.
 *
 * Before 2026-11-12 this middleware kept its own 50-step stacks of whole-store snapshots, with no
 * names and no way to tell whether undo was possible.
 */

/** The slices a step changes. Everything else in the store is not the document. */
export type DocumentSnapshot = Pick<StoreState, 'assets' | 'tracks' | 'clips' | 'trackOrder' | 'settings' | 'markers'>;

export type DocumentChange = { type: 'change'; before: DocumentSnapshot; after: DocumentSnapshot } | { type: 'reset' };

export type DocumentRecorder = {
  /** Calls `listener` for every change to the document; returns the unsubscribe. */
  recordDocument: (listener: (change: DocumentChange) => void) => () => void;
  /** Puts a snapshot's document back without reporting it as a change. */
  restoreDocument: (snapshot: DocumentSnapshot) => void;
};

const DOCUMENT_KEYS = ['assets', 'tracks', 'clips', 'trackOrder', 'settings', 'markers'] as const;

export const snapshotOf = (state: StoreState): DocumentSnapshot => ({
  assets: state.assets,
  tracks: state.tracks,
  clips: state.clips,
  trackOrder: state.trackOrder,
  settings: state.settings,
  markers: state.markers,
});

export const historyMiddleware = (
  config: StateCreator<StoreState, [], [['zustand/immer', never]]>
): StateCreator<StoreState, [], [['zustand/immer', never]]> => {
  return (set, get, api) => {
    const listeners = new Set<(change: DocumentChange) => void>();
    let quiet = false;
    const emit = (change: DocumentChange) => listeners.forEach((listener) => listener(change));

    const recorder: DocumentRecorder = {
      recordDocument: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      restoreDocument: (snapshot) => {
        const current = get();
        quiet = true;
        try {
          (set as (partial: Partial<StoreState>) => void)({
            ...snapshot,
            // A file's thumbnail, waveform and link arrive after it is added and are not steps: keep
            // the current copy of every file the snapshot has.
            assets: Object.fromEntries(Object.entries(snapshot.assets).map(([id, asset]) => [id, current.assets[id] ?? asset])),
            selectedClipId: current.selectedClipId && snapshot.clips[current.selectedClipId] ? current.selectedClipId : null,
            selectedAssetId: current.selectedAssetId && snapshot.assets[current.selectedAssetId] ? current.selectedAssetId : null,
          });
        } finally {
          quiet = false;
        }
      },
    };
    Object.assign(api, recorder);

    const recordingSet: typeof set = (args, ...rest) => {
      const before = get();
      (set as any)(args, ...rest);
      const after = get();
      if (quiet || listeners.size === 0) return;
      if (DOCUMENT_KEYS.some((key) => before[key] !== after[key])) {
        emit({ type: 'change', before: snapshotOf(before), after: snapshotOf(after) });
      }
    };

    const state = config(recordingSet, get, api);
    const loadProject = state.loadProject;
    return {
      ...state,
      loadProject: (project) => {
        quiet = true;
        try {
          loadProject(project);
        } finally {
          quiet = false;
        }
        emit({ type: 'reset' });
      },
    };
  };
};
