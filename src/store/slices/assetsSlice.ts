import { StateCreator } from 'zustand';
import { AssetsSlice, StoreState } from '../types';

export const createAssetsSlice: StateCreator<StoreState, [["zustand/immer", never]], [], AssetsSlice> = (set) => ({
  assets: [],
  selectedAssetId: null,
  addAsset: (asset) => set((state) => {
    state.assets.push(asset);
  }),
  removeAsset: (id) => set((state) => {
    state.assets = state.assets.filter((a) => a.id !== id);
    if (state.selectedAssetId === id) {
      state.selectedAssetId = null;
    }
  }),
  selectAsset: (id) => set((state) => {
    state.selectedAssetId = id;
  }),
});
