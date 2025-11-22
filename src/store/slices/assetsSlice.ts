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
