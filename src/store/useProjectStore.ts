import { create } from 'zustand';
import { Asset, Clip, ProjectState } from '../types';

interface ProjectActions {
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  selectAsset: (id: string | null) => void;
  addClip: (clip: Clip) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
}

export const useProjectStore = create<ProjectState & ProjectActions>((set) => ({
  assets: [],
  timeline: [],
  selectedAssetId: null,

  addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),
  removeAsset: (id) => set((state) => ({
    assets: state.assets.filter((a) => a.id !== id),
    timeline: state.timeline.filter((c) => c.assetId !== id)
  })),
  selectAsset: (id) => set({ selectedAssetId: id }),

  addClip: (clip) => set((state) => ({ timeline: [...state.timeline, clip] })),
  removeClip: (id) => set((state) => ({ timeline: state.timeline.filter((c) => c.id !== id) })),
  updateClip: (id, updates) => set((state) => ({
    timeline: state.timeline.map((c) => c.id === id ? { ...c, ...updates } : c)
  })),
}));
