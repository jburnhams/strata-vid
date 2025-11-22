import { StateCreator } from 'zustand';
import { Asset } from '../../types';

export interface AssetsSlice {
  assets: Asset[];
  selectedAssetId: string | null;
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  selectAsset: (id: string | null) => void;
}

export const createAssetsSlice: StateCreator<AssetsSlice, [["zustand/immer", never]], [], AssetsSlice> = (set) => ({
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
