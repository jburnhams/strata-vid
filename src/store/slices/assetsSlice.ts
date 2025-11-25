import { StateCreator } from 'zustand';
import { AssetsSlice, StoreState } from '../types';

export const createAssetsSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  AssetsSlice
> = (set) => ({
  assets: {},
  selectedAssetId: null,
  addAsset: (asset) =>
    set((state) => {
      state.assets[asset.id] = asset;
    }),
  updateAsset: (id, updates) =>
    set((state) => {
      const asset = state.assets[id];
      if (asset) {
        Object.assign(asset, updates);
      }
    }),
  removeAsset: (id) =>
    set((state) => {
      delete state.assets[id];
      if (state.selectedAssetId === id) {
        state.selectedAssetId = null;
      }
    }),
  selectAsset: (id) =>
    set((state) => {
      state.selectedAssetId = id;
    }),
});
