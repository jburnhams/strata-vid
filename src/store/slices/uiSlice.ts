import type { StateCreator } from 'zustand';
import type { UiSlice, StoreState } from '../types';

export const createUiSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  UiSlice
> = (set) => ({
  toasts: [],
  zoomLevel: 10,
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
  setZoomLevel: (zoomLevel) =>
    set((state) => {
      state.zoomLevel = zoomLevel;
    }),
  draggedAssetId: null,
  setDraggedAsset: (id) =>
    set((state) => {
      state.draggedAssetId = id;
    }),
});
