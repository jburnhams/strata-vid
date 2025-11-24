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
    store.undo();
    expect(store.getState().assets['a1']).toBeUndefined();
    expect(store.getState().playback.time).toBe(0); // Restores snapshot which had time 0

    // 4. Redo
    store.redo();
    expect(store.getState().assets['a1']).toBeDefined();
    expect(store.getState().playback.time).toBe(1); // Restores snapshot which had time 1
  });

  it('should clear redo stack (future) when new changes occur', () => {
    const useStore = create<any>()(
      historyMiddleware(
        immer((set) => ({
          assets: {},
          tracks: {},
          clips: {},
          trackOrder: [],
          settings: {},
          addAsset: (id: string) => set((state: any) => { state.assets[id] = {} }),
          addTrack: (id: string) => set((state: any) => { state.tracks[id] = {} }),
        }))
      )
    );

    const store = useStore as any;

    // 1. Add Asset 'a1' (History: [Initial])
    store.getState().addAsset('a1');
    expect(store.getState().assets['a1']).toBeDefined();

    // 2. Undo (History: [], Future: [State with a1])
    store.undo();
    expect(store.getState().assets['a1']).toBeUndefined();

    // 3. Verify Redo works
    store.redo();
    expect(store.getState().assets['a1']).toBeDefined();

    // 4. Undo again
    store.undo();
    expect(store.getState().assets['a1']).toBeUndefined();

    // 5. Perform a NEW action (Add Track)
    // This should clear the future stack (which contained 'State with a1')
    store.getState().addTrack('t1');
    expect(store.getState().tracks['t1']).toBeDefined();

    // 6. Try Redo - Should do NOTHING because future was cleared
    store.redo();

    // Expect track to still be there
    expect(store.getState().tracks['t1']).toBeDefined();
    // Expect asset 'a1' to NOT be there (because we didn't redo it, and we branched off)
    expect(store.getState().assets['a1']).toBeUndefined();
  });

  it('should respect history limit', () => {
      const useStore = create<any>()(
        historyMiddleware(
          immer((set) => ({
            assets: {},
            tracks: {},
            clips: {},
            trackOrder: [],
            settings: {},
            setSetting: (val: number) => set((state: any) => { state.settings.val = val }),
          }))
        )
      );

      const store = useStore as any;
      const LIMIT = 50;

      // Make 55 changes
      for (let i = 1; i <= LIMIT + 5; i++) {
          store.getState().setSetting(i);
      }

      // We should be at val = 55
      expect(store.getState().settings.val).toBe(55);

      // We can undo 50 times
      for (let i = 0; i < LIMIT; i++) {
          store.undo();
      }

      // The state should be val = 5 (since 1..5 were dropped)
      // Initial state was val undefined (0th).
      // 1st change: val=1.
      // ...
      // 5th change: val=5.
      // 6th change: val=6.
      // ...
      // 55th change: val=55.
      // History has [val=5, val=6, ... val=54]. (Wait, let's trace carefully)

      // When we are at 55. History contains 50 previous states.
      // The state *just before* 55 was 54. That is at the top of the stack.
      // The bottom of the stack (oldest) is what?
      // Total changes = 55.
      // We pushed 55 times.
      // We shifted 5 times.
      // So we dropped states corresponding to before change 1, 2, 3, 4, 5.
      // Wait.
      // Initial: empty.
      // Action 1: push Initial.
      // ...
      // Action 51: push State 50. Stack size 51. Shift -> Remove Initial.
      // Action 55: push State 54. Shift -> Remove State 4.

      // So stack contains: State 5, State 6, ... State 54.
      // Length 50.

      // Undo 1: Pop State 54. Current = 54.
      // Undo 50: Pop State 5. Current = 5.

      expect(store.getState().settings.val).toBe(5);

      // Undo again -> Should do nothing (stack empty)
      store.undo();
      expect(store.getState().settings.val).toBe(5);
  });
});
