import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createUiSlice } from '../../../src/store/slices/uiSlice';
import { StoreState } from '../../../src/store/types';

describe('uiSlice', () => {
  let store: any;

  beforeEach(() => {
    store = create<StoreState>()(
      immer((set, get, api) => ({
        // @ts-ignore - Minimal mock for testing uiSlice
        ...createUiSlice(set, get, api),
      }))
    );
  });

  it('should have initial state', () => {
    const state = store.getState();
    expect(state.isLoading).toBe(false);
    expect(state.toasts).toEqual([]);
  });

  it('should set loading state', () => {
    store.getState().setLoading(true, 'Loading...');
    expect(store.getState().isLoading).toBe(true);
    expect(store.getState().loadingMessage).toBe('Loading...');
  });

  it('should add a toast', () => {
    store.getState().addToast('Test', 'success');
    expect(store.getState().toasts).toHaveLength(1);
    expect(store.getState().toasts[0].message).toBe('Test');
  });

  it('should remove a toast', () => {
    store.getState().addToast('Test');
    const id = store.getState().toasts[0].id;
    store.getState().removeToast(id);
    expect(store.getState().toasts).toHaveLength(0);
  });
});
