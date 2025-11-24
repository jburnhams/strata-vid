import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { AssetLoader } from '../../src/services/AssetLoader';
import { Asset } from '../../src/types';

// Mock dependencies
jest.mock('../../src/services/AssetLoader');
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div>MapContainer{children}</div>,
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

describe('Undo/Redo Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('should undo and redo clip deletion', async () => {
    const user = userEvent.setup();

    // 1. Setup Mock Asset
    const mockAsset: Asset = {
      id: 'asset-1',
      name: 'video.mp4',
      type: 'video',
      src: 'blob:video',
      duration: 10,
      resolution: { width: 1920, height: 1080 }
    };
    (AssetLoader.loadAsset as jest.Mock).mockResolvedValue(mockAsset);

    render(<App />);

    // 2. Add Asset - Using accessible selector
    const libraryInput = screen.getByLabelText('Add Asset');
    await user.upload(libraryInput, new File(['dummy'], 'video.mp4', { type: 'video/mp4' }));

    // Verify clip added to timeline
    await waitFor(() => {
        const clips = document.querySelectorAll('[data-testid^="clip-item"]');
        expect(clips.length).toBe(1);
    });

    // 3. Select Clip
    const clipElement = document.querySelectorAll('[data-testid^="clip-item"]')[0];
    await user.click(clipElement);

    // 4. Delete Clip
    fireEvent.keyDown(window, { code: 'Delete' });

    // Verify clip is gone
    await waitFor(() => {
        const clips = document.querySelectorAll('[data-testid^="clip-item"]');
        expect(clips.length).toBe(0);
    });

    // 5. Undo via Menu
    // Hover Edit menu
    await user.hover(screen.getByText('Edit'));
    await user.click(screen.getByText('Undo'));

    // Verify clip is back
    await waitFor(() => {
        const clips = document.querySelectorAll('[data-testid^="clip-item"]');
        expect(clips.length).toBe(1);
    });

    // 6. Redo via Menu
    await user.hover(screen.getByText('Edit'));
    await user.click(screen.getByText('Redo'));

    // Verify clip is gone again
    await waitFor(() => {
        const clips = document.querySelectorAll('[data-testid^="clip-item"]');
        expect(clips.length).toBe(0);
    });
  });
});
