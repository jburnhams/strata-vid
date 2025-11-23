import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { parseGpxFile } from '../../src/utils/gpxParser';
import { useProjectStore } from '../../src/store/useProjectStore';

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

jest.mock('../../src/utils/gpxParser');
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
  });

  it('renders the application shell with all panels', () => {
    render(<App />);

    expect(screen.getByText('Strata Vid')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
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
});
