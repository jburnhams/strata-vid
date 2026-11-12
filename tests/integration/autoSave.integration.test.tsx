import { renderWithStrata } from 'strata-react/testing';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { chooseFiles } from '../utils/files';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { AssetLoader } from '../../src/services/AssetLoader';
import type { Asset } from '../../src/types';

// Mock dependencies
jest.mock('../../src/services/AssetLoader');
jest.mock('react-leaflet', () => ({
  MapContainer: () => <div>MapContainer</div>,
  TileLayer: () => <div>TileLayer</div>,
  Marker: () => <div>Marker</div>,
  Popup: () => <div>Popup</div>,
  useMap: () => ({ setView: jest.fn(), fitBounds: jest.fn() }),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock URL
window.URL.createObjectURL = jest.fn(() => 'blob:url');
window.URL.revokeObjectURL = jest.fn();

describe('AutoSave Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock localStorage
    const store: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value; }),
        clear: jest.fn(() => { for (const key in store) delete store[key]; }),
        removeItem: jest.fn((key) => { delete store[key]; }),
      },
      writable: true,
    });
  });

  it('should auto-save project to localStorage after interval', async () => {
    // We need to use fake timers for the 60s interval
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    // 1. Setup Mock Asset
    const mockAsset: Asset = {
      id: 'asset-1',
      name: 'autosave_video.mp4',
      type: 'video',
      src: 'blob:video',
      duration: 10,
      resolution: { width: 1920, height: 1080 }
    };
    (AssetLoader.loadAsset as jest.Mock).mockResolvedValue(mockAsset);

    renderWithStrata(<App />);

    // 2. Add Asset to trigger state change - use accessible selector
    const videoFile = new File(['dummy'], 'autosave_video.mp4', { type: 'video/mp4' });
    chooseFiles(screen.getByRole('button', { name: 'Add files' }), [videoFile]);

    // Verify asset loaded
    await waitFor(() => {
        expect(screen.getByTestId(/^asset-item-/)).toHaveTextContent('autosave_video.mp4');
    });

    // 3. Fast-forward time (60s)
    jest.advanceTimersByTime(60000 + 100);

    // 4. Verify localStorage
    expect(window.localStorage.setItem).toHaveBeenCalledWith('strata_vid_autosave', expect.any(String));

    // Verify content
    const savedCall = (window.localStorage.setItem as jest.Mock).mock.calls.find(c => c[0] === 'strata_vid_autosave');
    const savedJson = JSON.parse(savedCall[1]);
    expect(savedJson.assets).toBeDefined();
    // Since random IDs are used, we check if any asset has the name
    const hasAsset = Object.values(savedJson.assets).some((a: any) => a.fileName === 'autosave_video.mp4');
    expect(hasAsset).toBe(true);

    jest.useRealTimers();
  });
});
