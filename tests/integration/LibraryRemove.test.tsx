import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';
import { Asset, Clip, Track } from '../../src/types';

// Mock dependencies
jest.mock('../../src/services/AssetLoader');
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div>{children}</div>,
  TileLayer: () => <div>TileLayer</div>,
  useMap: () => ({ fitBounds: jest.fn() }),
}));

// Mock PreviewPanel to avoid complex rendering
jest.mock('../../src/components/PreviewPanel', () => ({
  PreviewPanel: () => <div data-testid="preview-panel">Preview Panel</div>
}));

// Mock TimelinePanel to avoid complex rendering, but we need it to ensure store is connected
jest.mock('../../src/components/TimelinePanel', () => ({
  TimelinePanel: () => <div data-testid="timeline-panel">Timeline Panel</div>
}));

describe('Library Asset Removal Integration', () => {
  const initialState = useProjectStore.getState();

  beforeEach(() => {
    useProjectStore.setState(initialState, true);
    jest.clearAllMocks();
  });

  const setupStoreWithAssetAndClip = () => {
    const asset: Asset = {
      id: 'asset-1',
      name: 'video.mp4',
      type: 'video',
      src: 'blob:video1',
      duration: 10,
      file: new File([''], 'video.mp4'),
    };

    const track: Track = {
      id: 'track-1',
      type: 'video',
      label: 'Video Track',
      isMuted: false,
      isLocked: false,
      clips: ['clip-1'],
    };

    const clip: Clip = {
      id: 'clip-1',
      assetId: 'asset-1',
      trackId: 'track-1',
      start: 0,
      duration: 5,
      offset: 0,
      type: 'video',
      properties: {},
    };

    useProjectStore.setState((state) => {
      state.assets['asset-1'] = asset;
      state.tracks['track-1'] = track;
      state.clips['clip-1'] = clip;
      state.trackOrder = ['track-1'];
    });

    return { asset, track, clip };
  };

  const setupStoreWithUnusedAsset = () => {
    const asset: Asset = {
      id: 'asset-unused',
      name: 'unused.mp4',
      type: 'video',
      src: 'blob:unused',
      duration: 10,
      file: new File([''], 'unused.mp4'),
    };

    useProjectStore.setState((state) => {
      state.assets['asset-unused'] = asset;
    });

    return { asset };
  };

  test('removing an unused asset should happen immediately without prompt', () => {
    setupStoreWithUnusedAsset();
    render(<App />);

    const removeBtn = screen.getByTestId('remove-asset-asset-unused');
    fireEvent.click(removeBtn);

    // Verify asset is gone
    const state = useProjectStore.getState();
    expect(state.assets['asset-unused']).toBeUndefined();

    // Verify no modal
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
  });

  test('removing a used asset should trigger confirmation modal', () => {
    setupStoreWithAssetAndClip();
    render(<App />);

    const removeBtn = screen.getByTestId('remove-asset-asset-1');
    fireEvent.click(removeBtn);

    // Modal should appear
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByText(/This asset is currently used in your timeline/)).toBeInTheDocument();

    // Asset should still be there
    const state = useProjectStore.getState();
    expect(state.assets['asset-1']).toBeDefined();
  });

  test('canceling the modal should preserve the asset and clip', () => {
    setupStoreWithAssetAndClip();
    render(<App />);

    // Click remove
    fireEvent.click(screen.getByTestId('remove-asset-asset-1'));

    // Click cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Modal gone
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();

    // Asset and clip still exist
    const state = useProjectStore.getState();
    expect(state.assets['asset-1']).toBeDefined();
    expect(state.clips['clip-1']).toBeDefined();
  });

  test('confirming the modal should remove asset and all associated clips', () => {
    setupStoreWithAssetAndClip();
    render(<App />);

    // Click remove
    fireEvent.click(screen.getByTestId('remove-asset-asset-1'));

    // Click confirm
    fireEvent.click(screen.getByTestId('confirm-modal-confirm-btn'));

    // Modal gone
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();

    // Verify store state
    const state = useProjectStore.getState();
    expect(state.assets['asset-1']).toBeUndefined(); // Asset gone
    expect(state.clips['clip-1']).toBeUndefined(); // Clip gone
    expect(state.tracks['track-1'].clips).not.toContain('clip-1'); // Track updated
  });
});
