import { renderWithStrata } from 'strata-react/testing';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';
import { AssetLoader } from '../../src/services/AssetLoader';
import { chooseFiles } from '../utils/files';

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

jest.mock('../../src/utils/gpxParser');
jest.mock('../../src/services/AssetLoader');

// Mock PreviewPanel to avoid Leaflet issues
jest.mock('../../src/components/PreviewPanel', () => ({
  PreviewPanel: () => <div>Mock Preview Panel</div>
}));

// Mock useAutoSave to prevent side effects in tests
jest.mock('../../src/hooks/useAutoSave', () => ({
  useAutoSave: () => {},
}));

describe('App', () => {
  const initialState = useProjectStore.getState();
  beforeEach(() => {
    useProjectStore.setState(initialState, true);
    (AssetLoader.loadAsset as jest.Mock).mockClear();

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the application shell with all panels', () => {
    renderWithStrata(<App />);

    expect(screen.getByText('Strata Vid')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Nothing selected')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export video' })).toHaveAttribute('data-variant', 'default');
    expect(screen.getByText('Mock Preview Panel')).toBeInTheDocument();
  });

  it('adds an asset when a file is uploaded', async () => {
    const user = userEvent.setup();
    renderWithStrata(<App />);

    // Select the library input (accepts video/gpx), not the project load input
    const input = document.querySelector('input[accept*="video"]') as HTMLInputElement;
    const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

    await user.upload(input, file);

    // check that the store has been updated
    await waitFor(() => {
        const { assets } = useProjectStore.getState();
        expect(Object.values(assets).length).toBe(1);
        expect(Object.values(assets)[0].name).toBe('video.mp4');
    });
  });

  it('handles asset loading error gracefully', async () => {
    // Mock AssetLoader to fail
    (AssetLoader.loadAsset as jest.Mock).mockRejectedValue(new Error('Load failed'));
    const user = userEvent.setup();
    renderWithStrata(<App />);
    const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });
    chooseFiles(screen.getByRole('button', { name: 'Add files' }), [file]);

    // The failure is shown beside the file with its reason, and nothing is added
    expect(await screen.findByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Load failed')).toBeInTheDocument();
    expect(screen.queryByTestId(/^asset-item-/)).not.toBeInTheDocument();
  });
});
