import React from 'react';
import { describe, it, expect } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/src/App';
import { useProjectStore } from '@/src/store/useProjectStore';

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

// Mock AssetLoader to avoid actual file processing/mediabunny
jest.mock('@/src/services/AssetLoader', () => ({
  AssetLoader: {
    loadAsset: jest.fn(async (file: File) => ({
      id: 'mock-asset-id',
      name: file.name,
      type: 'video',
      duration: 60,
      src: 'mock-url',
      file
    }))
  }
}));

// We need to mock ResizeObserver for the TimelineContainer/Ruler
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Timeline Integration', () => {
  beforeEach(() => {
    useProjectStore.setState({
      assets: {},
      tracks: {},
      clips: {},
      trackOrder: [],
      selectedAssetId: null
    });
  });

  it('automatically adds a track and clip when a video is uploaded', async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Upload a video
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test-video.mp4', { type: 'video/mp4' });
    await user.upload(input, file);

    // 2. Wait for asset to be loaded and added to store
    await waitFor(() => {
      expect(screen.getAllByText('test-video.mp4').length).toBeGreaterThan(0);
    });

    // 3. Verify Timeline state
    // The App logic says: if asset is video, find/create video track and add clip.

    // Check if "Video Track 1" exists (default label)
    await waitFor(() => {
        expect(screen.getByText('Video Track 1')).toBeInTheDocument();
    });

    // Check if the clip is rendered in the timeline
    // ClipItem renders the ID by default, but maybe we can verify its existence by class or structure
    // Or, since we know the ID generation in App.tsx is random, we might look for the element logic.
    // But wait, App.tsx uses `Math.random().toString(36).substr(2, 9)` for clip ID.
    // It will be displayed in the ClipItem: `{clip.id}`.

    // We can check if *any* clip item is present.
    // ClipItem has `rounded border border-blue-500 ...`
    const clips = document.querySelectorAll('.border-blue-500');
    expect(clips.length).toBeGreaterThan(0);

    // Verify Ruler is present
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
});
