import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';
import { AssetLoader } from '../../src/services/AssetLoader';

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

jest.mock('../../src/utils/gpxParser');
jest.mock('../../src/services/AssetLoader');

// Mock PreviewPanel to avoid Leaflet issues
jest.mock('../../src/components/PreviewPanel', () => ({
  PreviewPanel: () => <div>Mock Preview Panel</div>
}));

describe('App', () => {
  beforeEach(() => {
     jest.clearAllMocks();
     useProjectStore.setState({
         assets: {},
         tracks: {},
         clips: {},
         trackOrder: [],
         selectedAssetId: null
     });

     // Default mock implementation
     (AssetLoader.loadAsset as jest.Mock).mockImplementation(async (file) => ({
         id: 'mock-id',
         name: file.name,
         type: 'video',
         duration: 10,
         src: 'mock-src',
         file
     }));
  });

  it('renders the application shell with all panels', () => {
    render(<App />);

    expect(screen.getByText('Strata Vid')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Metadata')).toBeInTheDocument();
    // Timeline Panel no longer has a static header "Timeline"
    // Instead we check for its content like "Zoom:" or "Add Track"
    expect(screen.getByText(/Zoom:/)).toBeInTheDocument();
    expect(screen.getByText('Mock Preview Panel')).toBeInTheDocument();
  });

  it('adds an asset when a file is uploaded', async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

    await user.upload(input, file);

    // Expect the asset to appear in the library list
    // use findByText to wait for async state update
    const items = await screen.findAllByText('video.mp4');
    expect(items.length).toBeGreaterThan(0);
  });

  it('handles asset loading error gracefully', async () => {
    // Mock AssetLoader to fail
    (AssetLoader.loadAsset as jest.Mock).mockRejectedValue(new Error('Load failed'));
    const user = userEvent.setup();
    render(<App />);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // Use a valid file extension to pass 'accept' attribute check in LibraryPanel
    const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

    await user.upload(input, file);

    await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load asset:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
