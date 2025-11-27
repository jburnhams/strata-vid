
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createAssetsSlice } from '../../../src/store/slices/assetsSlice';
import { StoreState } from '../../../src/store/types';
import { AssetLoader } from '../../../src/services/AssetLoader';

// Mock the AssetLoader
jest.mock('../../../src/services/AssetLoader');

describe('assetsSlice', () => {
  // @ts-ignore
  const useTestStore = create<StoreState>()(
    immer((...a) => ({
        // @ts-ignore
        ...createAssetsSlice(...a),
    }))
  );
  const { getState, setState } = useTestStore;

  beforeEach(() => {
    // Reset the store's state before each test
    setState({ assets: {}, selectedAssetId: null });
    // Clear mock history
    jest.clearAllMocks();
  });

  it('should add an asset', () => {
    const newAsset = { id: 'asset1', name: 'Test Asset', type: 'video', src: 'test.mp4' };
    // @ts-ignore
    getState().addAsset(newAsset);
    expect(getState().assets['asset1']).toEqual(newAsset);
  });

  it('should update an asset', () => {
    const asset = { id: 'asset1', name: 'Initial Name', type: 'video', src: 'test.mp4' };
    // @ts-ignore
    setState({ assets: { asset1: asset } });

    getState().updateAsset('asset1', { name: 'Updated Name' });
    expect(getState().assets['asset1'].name).toBe('Updated Name');
  });

  it('should not throw when updating a non-existent asset', () => {
    expect(() => getState().updateAsset('non-existent', { name: 'New Name' })).not.toThrow();
  });

  it('should remove an asset and revoke it', () => {
    const asset = { id: 'asset1', name: 'Test Asset', type: 'video', src: 'test.mp4' };
    // @ts-ignore
    setState({ assets: { asset1: asset }, selectedAssetId: 'asset1' });

    getState().removeAsset('asset1');
    expect(getState().assets['asset1']).toBeUndefined();
    expect(getState().selectedAssetId).toBeNull();
    expect(AssetLoader.revokeAsset).toHaveBeenCalledWith(asset);
  });

  it('should remove an asset without changing selection if a different one is selected', () => {
    // @ts-ignore
    setState({
        assets: { asset1: {id: 'asset1'}, asset2: {id: 'asset2'} },
        selectedAssetId: 'asset2'
    });
    getState().removeAsset('asset1');
    expect(getState().assets['asset1']).toBeUndefined();
    expect(getState().selectedAssetId).toBe('asset2');
    expect(AssetLoader.revokeAsset).toHaveBeenCalled();
  });

  it('should select an asset', () => {
    getState().selectAsset('asset1');
    expect(getState().selectedAssetId).toBe('asset1');
  });

  it('should reprocess a GPX asset', async () => {
    const gpxAsset = { id: 'gpx1', type: 'gpx', src: 'track.gpx', gpxPoints: [] };
    // @ts-ignore
    setState({ assets: { gpx1: gpxAsset } });

    const updatedData = { gpxPoints: [{ lat: 1, lon: 1, ele: 1, time: 1 }] };
    (AssetLoader.reprocessGpxAsset as jest.Mock).mockResolvedValue(updatedData);

    await getState().reprocessGpxAsset('gpx1', 0.0005);

    expect(AssetLoader.reprocessGpxAsset).toHaveBeenCalledWith(expect.objectContaining({ id: 'gpx1' }), 0.0005);
    expect(getState().assets['gpx1'].gpxPoints).toEqual(updatedData.gpxPoints);
  });

  it('should not reprocess a non-GPX asset', async () => {
    const videoAsset = { id: 'video1', type: 'video', src: 'video.mp4' };
    // @ts-ignore
    setState({ assets: { video1: videoAsset } });

    await getState().reprocessGpxAsset('video1', 0.0005);

    expect(AssetLoader.reprocessGpxAsset).not.toHaveBeenCalled();
  });

  it('should handle errors during reprocessing', async () => {
    const gpxAsset = { id: 'gpx1', type: 'gpx', src: 'track.gpx', gpxPoints: [] };
    // @ts-ignore
    setState({ assets: { gpx1: gpxAsset } });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (AssetLoader.reprocessGpxAsset as jest.Mock).mockRejectedValue(new Error('Reprocessing failed'));

    await getState().reprocessGpxAsset('gpx1', 0.0005);

    expect(console.error).toHaveBeenCalledWith('Failed to reprocess GPX asset:', expect.any(Error));
    // Ensure the asset data has not changed
    expect(getState().assets['gpx1'].gpxPoints).toEqual([]);

    consoleErrorSpy.mockRestore();
  });
});
