import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { historyMiddleware } from '../../../src/store/middleware/historyMiddleware';

describe('historyMiddleware', () => {
  it('should track history for relevant fields', () => {
    const useStore = create<any>()(
      historyMiddleware(
        immer((set) => ({
          assets: {},
          tracks: {},
          clips: {},
          trackOrder: [],
          settings: {},
          playback: { time: 0 },

          addAsset: (id: string) => set((state: any) => { state.assets[id] = {} }),
          updatePlayback: () => set((state: any) => { state.playback.time += 1 }),
        }))
      )
    );

    const store = useStore as any;

    // Initial check
    expect(store.getState().playback.time).toBe(0);

    // 1. Add Asset (Should snapshot initial state)
    store.getState().addAsset('a1');
    expect(store.getState().assets['a1']).toBeDefined();

    // 2. Update Playback (Should NOT snapshot)
    store.getState().updatePlayback();
    expect(store.getState().playback.time).toBe(1);

    // 3. Undo
    // Should revert to state before Add Asset?
    // We pushed "initial state" when "Add Asset" happened (because it changed assets).
    // We did NOT push when "Update Playback" happened (because it didn't change assets/tracks...).
    // So 'past' contains [InitialState].
    // Undo pops InitialState and sets it.

    store.undo();
    expect(store.getState().assets['a1']).toBeUndefined();
    expect(store.getState().playback.time).toBe(0);

    // 4. Redo
    store.redo();
    expect(store.getState().assets['a1']).toBeDefined();
    expect(store.getState().playback.time).toBe(1);
  });
});
