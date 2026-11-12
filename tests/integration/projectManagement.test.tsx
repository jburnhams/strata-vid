import { renderWithStrata } from 'strata-react/testing';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { chooseFiles } from '../utils/files';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { AssetLoader } from '../../src/services/AssetLoader';
import type { Asset } from '../../src/types';

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

describe('Project Management Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('should allow adding asset, saving, clearing, and loading', async () => {
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

    const { container } = renderWithStrata(<App />);

    // 2. Add Asset - Updated selector to match new accessibility structure
    const videoFile = new File(['dummy'], 'video.mp4', { type: 'video/mp4' });
    chooseFiles(screen.getByRole('button', { name: 'Add files' }), [videoFile]);

    // Verify asset added
    await waitFor(() => {
      const elements = screen.getAllByText('video.mp4');
      expect(elements.length).toBeGreaterThan(0);
    });

    // 3. Save Project
    let savedBlob: Blob | null = null;
    (window.URL.createObjectURL as jest.Mock).mockImplementation((blob: Blob) => {
      savedBlob = blob;
      return 'blob:saved-project';
    });

    const link = document.createElement('a');
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
        if (tagName === 'a') return link;
        return originalCreateElement(tagName, options);
    });
    jest.spyOn(link, 'click').mockImplementation(() => {});

    // Hover File menu to show options
    await user.click(screen.getByRole('button', { name: 'File' }));
    await user.click(screen.getByRole('menuitem', { name: 'Save project' }));

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(savedBlob).not.toBeNull();

    const savedText = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(savedBlob as Blob);
    });
    const savedJson = JSON.parse(savedText);
    expect(savedJson.assets['asset-1']).toBeDefined();
    expect(savedJson.assets['asset-1'].fileName).toBe('video.mp4');

    // 4. New Project (Clear)
    await user.click(screen.getByRole('button', { name: 'File' }));
    await user.click(screen.getByRole('menuitem', { name: 'New project' }));
    await user.click(await screen.findByRole('button', { name: 'Start new project' }));

    // Verify cleared
    await waitFor(() => {
        expect(screen.getByText('Drag videos, audio or GPX tracks here')).toBeInTheDocument();
        expect(screen.queryByTestId(/^asset-item-/)).not.toBeInTheDocument();
    });

    // 5. Load Project
    const loadInput = screen.getByTestId('file-input');
    const projectFile = new File([savedText], 'project.svp', { type: 'application/json' });

    await user.upload(loadInput, projectFile);

    // 6. Verify Asset is back
    await waitFor(() => {
      const elements = screen.getAllByText('video.mp4');
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
