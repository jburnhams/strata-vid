import { useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { serializeProject, deserializeProject, applyProjectState } from '../utils/projectSerializer';

const AUTO_SAVE_KEY = 'strata_vid_autosave';
const SAVE_INTERVAL = 60000; // 60 seconds

export function useAutoSave() {
  const store = useProjectStore();

  // Load on mount
  useEffect(() => {
    const saved = localStorage.getItem(AUTO_SAVE_KEY);
    if (saved) {
      try {
         const state = deserializeProject(saved);
         if (state) {
             // Check if store is empty (it should be on fresh load)
             const currentAssets = useProjectStore.getState().assets;
             const currentTracks = useProjectStore.getState().tracks;

             if (Object.keys(currentAssets).length === 0 && Object.keys(currentTracks).length === 0) {
                 console.log('Restoring auto-saved project...');
                 applyProjectState(store, state);
             }
         }
      } catch (e) {
          console.warn('Failed to restore auto-save', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Save periodically
  useEffect(() => {
    const interval = setInterval(() => {
        const state = useProjectStore.getState();
        // Only save if there's something to save (or maybe we want to save empty state too? No, annoying)
        if (Object.keys(state.assets).length > 0 || Object.keys(state.tracks).length > 0) {
            const json = serializeProject(state);
            localStorage.setItem(AUTO_SAVE_KEY, json);
            // console.log('Auto-saved project');
        }
    }, SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, []);
}
