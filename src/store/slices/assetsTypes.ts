import { Asset } from '../../types';

export interface AssetsSlice {
  assets: Record<string, Asset>;
  selectedAssetId: string | null;
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  selectAsset: (id: string | null) => void;
}
