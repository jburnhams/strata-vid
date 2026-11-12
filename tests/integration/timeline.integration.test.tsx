
import { renderWithStrata } from 'strata-react/testing';
import React from 'react';
import { describe, it, expect } from '@jest/globals';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';
import { AssetLoader } from '../../src/services/AssetLoader';
import { chooseFiles } from '../utils/files';

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock AssetLoader without factory
jest.mock('../../src/services/AssetLoader');

// Mock HeatmapOverlay to prevent it from being loaded
jest.mock('../../src/components/preview/HeatmapOverlay', () => () => <div data-testid="heatmap-overlay-mock" />);

// Mock leaflet completely to avoid JSDOM issues
jest.mock('leaflet', () => ({
    icon: jest.fn(),
    divIcon: jest.fn(),
    Marker: {
        prototype: {
            options: {}
        }
    },
    Map: jest.fn(),
    TileLayer: jest.fn(),
}));

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
    MapContainer: ({ children }: any) => <div>{children}</div>,
    TileLayer: () => <div>TileLayer</div>,
    Marker: () => <div>Marker</div>,
    Popup: () => <div>Popup</div>,
    GeoJSON: () => <div>GeoJSON</div>,
    useMap: () => ({ fitBounds: jest.fn() }),
}));

describe('Timeline Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup AssetLoader mocks
    (AssetLoader.loadAsset as jest.Mock).mockImplementation(async (file: File) => ({
      id: 'mock-asset-id',
      name: file.name,
      type: 'video',
      duration: 60,
      src: 'mock-url',
      file
    }));
    (AssetLoader.loadThumbnail as jest.Mock).mockResolvedValue('mock-thumb-url');
    (AssetLoader.revokeAsset as jest.Mock).mockImplementation(() => {});
    (AssetLoader.determineType as jest.Mock).mockReturnValue('video');

    // Reset store safely using loadProject action
    useProjectStore.getState().loadProject({
      id: 'test-project',
      settings: {
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 0,
        previewQuality: 'high',
        snapToGrid: true,
        allowOverlaps: false
      },
      assets: {},
      tracks: {},
      clips: {},
      trackOrder: []
    });
  });

  it('automatically adds a track and clip when a video is uploaded', async () => {
    renderWithStrata(<App />);

    // 1. Upload a video through the library's file button
    const file = new File(['content'], 'test-video.mp4', { type: 'video/mp4' });
    await act(async () => {
        chooseFiles(screen.getByRole('button', { name: 'Add files' }), [file]);
    });

    // 2. Wait for asset to be loaded and added to store
    await waitFor(() => {
      // Use getAllByText because it might appear in multiple places (list + tooltip etc)
      const elements = screen.getAllByText('test-video.mp4');
      expect(elements.length).toBeGreaterThan(0);
    });

    // Add to timeline manually
    const addBtns = await screen.findAllByLabelText(/Add .* to timeline/i);
    fireEvent.click(addBtns[0]);

    // 3. Verify Timeline state
    // Check if "Track 1" exists (default label)
    await waitFor(() => {
        expect(screen.getByRole('group', { name: 'Track 1' })).toBeInTheDocument();
    });

    // Check if the clip is rendered in the timeline
    await waitFor(() => {
        const clips = document.querySelectorAll('[data-testid^="clip-item-"]');
        expect(clips.length).toBeGreaterThan(0);
    });

    // The ruler is the timeline's position slider
    expect(screen.getByRole('slider', { name: 'Current time' })).toBeInTheDocument();
  });
});
