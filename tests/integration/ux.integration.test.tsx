import { StrataToastRegion } from 'strata-react';
import { renderWithStrata } from 'strata-react/testing';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { chooseFiles } from '../utils/files';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { AssetLoader } from '../../src/services/AssetLoader';
import { useProjectStore } from '../../src/store/useProjectStore';

// Mock AssetLoader
jest.mock('../../src/services/AssetLoader', () => ({
  AssetLoader: {
    loadAsset: jest.fn(),
    loadThumbnail: jest.fn(async () => 'blob:thumb'),
  },
}));

// Mock PreviewPanel to avoid Leaflet issues
jest.mock('../../src/components/PreviewPanel', () => ({
  PreviewPanel: () => <div data-testid="preview-panel">Preview</div>
}));

describe('UX Integration Flow', () => {
    beforeEach(() => {
        // Reset store state completely
        useProjectStore.setState({
            assets: {},
            clips: {},
            tracks: {},
            trackOrder: [],
            selectedAssetId: null,
            toasts: [],
            isLoading: false,
            currentTime: 0,
            isPlaying: false,
            playbackRate: 1,
            settings: { width: 1920, height: 1080, fps: 30, duration: 60 },
            id: 'test-project',
            loadingMessage: null
        });
    });

    it('should show loading state and success toast when adding asset', async () => {
        const user = userEvent.setup();
        const file = new File(['dummy'], 'video.mp4', { type: 'video/mp4' });

        (AssetLoader.loadAsset as jest.Mock).mockImplementation(async (f) => {
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 50));
            return {
                id: '123',
                name: f.name,
                type: 'video',
                src: 'blob:url',
                duration: 10,
                resolution: { width: 1920, height: 1080 },
                thumbnail: 'blob:thumb',
                file: f
            };
        });

        renderWithStrata(<><App /><StrataToastRegion /></>);

        // The input is hidden inside the label. We find the input associated with the label text "+ Add"
        // Wait for it to be ready
        chooseFiles(await screen.findByRole('button', { name: 'Add files' }), [file]);

        // The file's own outcome says it was added (no full-screen overlay, no toast)
        expect(await screen.findByText('Added')).toBeInTheDocument();

        // Check asset is in library and thumbnail is shown
        const libraryItem = screen.getAllByText('video.mp4')[0];
        expect(libraryItem).toBeInTheDocument();

        // Updated expectation for alt text
        const thumb = screen.getByAltText('Thumbnail for video.mp4');
        expect(thumb).toHaveAttribute('src', 'blob:thumb');
    });

    it('should show error toast when asset loading fails', async () => {
        const user = userEvent.setup();
        const file = new File(['bad'], 'bad.mp4', { type: 'video/mp4' });

        (AssetLoader.loadAsset as jest.Mock).mockRejectedValue(new Error('Corrupt file'));

        renderWithStrata(<><App /><StrataToastRegion /></>);

        chooseFiles(screen.getByRole('button', { name: 'Add files' }), [file]);

        // The failure is named beside the file, with its reason and a retry
        expect(await screen.findByText('Failed')).toBeInTheDocument();
        expect(screen.getByText('Corrupt file')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
    });
});
