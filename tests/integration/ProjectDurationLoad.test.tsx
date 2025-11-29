import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';

// Mocks
jest.mock('../../src/services/AssetLoader', () => ({
  AssetLoader: {
    loadAsset: jest.fn(),
    loadThumbnail: jest.fn(),
    revokeAsset: jest.fn(),
  },
}));

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

describe('Project Duration Load Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    const initialState = useProjectStore.getState();
    useProjectStore.setState({ ...initialState, tracks: {}, clips: {}, trackOrder: [] }, true);
  });

  it('should recalculate duration when loading a project with duration 0 but existing clips', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Create a mock serialized project with a clip but 0 duration
    // The structure must match SerializedProject in projectSerializer.ts
    const mockSerializedProject = {
      version: 1,
      project: {
        id: 'test-project',
        settings: {
          width: 1920,
          height: 1080,
          fps: 30,
          duration: 0, // THE BUG: Duration is 0 despite having clips
          previewQuality: 'high',
          snapToGrid: true,
          allowOverlaps: false,
          simplificationTolerance: 0.0001,
        },
      },
      assets: {
        'asset-1': {
          id: 'asset-1',
          name: 'video.mp4',
          type: 'video',
          src: null,
          fileName: 'video.mp4',
          duration: 10,
          resolution: { width: 1920, height: 1080 }
        }
      },
      timeline: {
        tracks: {
          'track-1': {
            id: 'track-1',
            name: 'Track 1',
            type: 'video',
            clips: ['clip-1'],
            isMuted: false,
            isLocked: false,
            volume: 1
          }
        },
        clips: {
          'clip-1': {
            id: 'clip-1',
            trackId: 'track-1',
            assetId: 'asset-1',
            start: 0,
            duration: 5, // Clip ends at 5s
            offset: 0,
            type: 'video',
            playbackRate: 1,
            properties: { opacity: 1, scale: 1, position: { x: 0, y: 0 }, rotation: 0 }
          }
        },
        trackOrder: ['track-1']
      },
      lastSaved: Date.now()
    };

    const projectJson = JSON.stringify(mockSerializedProject);
    const projectFile = new File([projectJson], 'project.svp', { type: 'application/json' });

    // Find the file input for loading project
    // In App.tsx or Header, there should be a file input.
    // Assuming the "Load Project" button triggers a hidden file input or opens a dialog.
    // Based on `projectManagement.test.tsx`, it uses `screen.getByTestId('file-input')`.
    // I need to confirm `App.tsx` has this input or where it is.
    // Looking at memory/previous knowledge, there is a header.

    // Let's verify if the input is available
    const loadInput = screen.getByTestId('file-input');

    // Load the project
    await user.upload(loadInput, projectFile);

    // Wait for the state to update
    await waitFor(() => {
        // We can check the store directly or check the UI.
        // Checking the store is more direct for this bug.
        const duration = useProjectStore.getState().settings.duration;
        // The test expects the duration to be updated to 5 (the end of the clip)
        expect(duration).toBe(5);
    });
  });
});
