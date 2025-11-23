import { StateCreator } from 'zustand';
import { UiSlice, StoreState } from '../types';

export const createUiSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  UiSlice
> = (set) => ({
  isLoading: false,
  loadingMessage: null,
  toasts: [],
  setLoading: (isLoading, message = null) =>
    set((state) => {
      state.isLoading = isLoading;
      state.loadingMessage = message;
    }),
  addToast: (message, type = 'info', duration = 3000) =>
    set((state) => {
      state.toasts.push({
        id: crypto.randomUUID(),
        message,
        type,
        duration,
      });
    }),
  removeToast: (id) =>
    set((state) => {
      state.toasts = state.toasts.filter((t) => t.id !== id);
    }),
});
