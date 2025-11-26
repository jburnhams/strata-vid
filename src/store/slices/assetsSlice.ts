import { StateCreator } from 'zustand';
import { AssetsSlice, StoreState } from '../types';
import { AssetLoader } from '../../services/AssetLoader';

export const createAssetsSlice: StateCreator<
  StoreState,
  [['zustand/immer', never]],
  [],
  AssetsSlice
> = (set, get) => ({
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
  reprocessGpxAsset: async (id, tolerance) => {
    const asset = get().assets[id];
    if (asset && asset.type === 'gpx') {
      try {
        const updatedData = await AssetLoader.reprocessGpxAsset(asset, tolerance);
        set((state) => {
          const targetAsset = state.assets[id];
          if (targetAsset) {
            Object.assign(targetAsset, updatedData);
          }
        });
      } catch (error) {
        console.error('Failed to reprocess GPX asset:', error);
      }
    }
  },
});
