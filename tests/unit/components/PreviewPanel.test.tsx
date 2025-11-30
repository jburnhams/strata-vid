import React from 'react';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '../../../src/components/PreviewPanel';
import { useProjectStore } from '../../../src/store/useProjectStore';

// Mock dependencies
jest.mock('../../../src/hooks/usePlaybackLoop', () => ({
  usePlaybackLoop: jest.fn(),
}));

jest.mock('../../../src/components/preview/VideoPlayer', () => ({
  VideoPlayer: () => <div data-testid="video-player">Video Player</div>,
}));

jest.mock('../../../src/components/preview/OverlayRenderer', () => ({
  OverlayRenderer: () => <div data-testid="overlay-renderer">Overlay Renderer</div>,
}));

describe('PreviewPanel', () => {
  beforeEach(() => {
    useProjectStore.setState({
      currentTime: 10,
      isPlaying: false,
      playbackRate: 1,
      clips: {},
      tracks: {},
      trackOrder: [],
      assets: {},
    });
  });

  test('renders current time when no clips are active', () => {
    render(<PreviewPanel />);
    expect(screen.getByText('10.00s')).toBeInTheDocument();
  });

  test('renders video player for active video clips', () => {
    const assetId = 'asset-1';
    const trackId = 'track-1';
    const clipId = 'clip-1';

    useProjectStore.setState({
      currentTime: 5,
      assets: {
        [assetId]: {
          id: assetId,
          file: new File([], 'video.mp4'),
          type: 'video',
          name: 'Video 1',
          duration: 10,
          resourceId: 'res-1',
          metadata: { width: 1920, height: 1080 }
        }
      },
      tracks: {
        [trackId]: {
          id: trackId,
          type: 'video',
          clips: [clipId],
          isMuted: false,
          isLocked: false,
          label: 'Video Track'
        }
      },
      trackOrder: [trackId],
      clips: {
        [clipId]: {
          id: clipId,
          assetId,
          trackId,
          start: 0,
          duration: 10,
          offset: 0,
          type: 'video',
          properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }
        }
      }
    });

    render(<PreviewPanel />);
    expect(screen.getByTestId('video-player')).toBeInTheDocument();
  });

  test('renders overlay renderer for non-video clips', () => {
    const trackId = 'track-1';
    const clipId = 'clip-1';

    useProjectStore.setState({
      currentTime: 5,
      tracks: {
        [trackId]: {
          id: trackId,
          type: 'overlay',
          clips: [clipId],
          isMuted: false,
          isLocked: false,
          label: 'Overlay Track'
        }
      },
      trackOrder: [trackId],
      clips: {
        [clipId]: {
          id: clipId,
          assetId: 'none',
          trackId,
          start: 0,
          duration: 10,
          offset: 0,
          type: 'text',
          content: 'Hello',
          properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }
        }
      }
    });

    render(<PreviewPanel />);
    expect(screen.getByTestId('overlay-renderer')).toBeInTheDocument();
  });

  test('renders clips from muted tracks (visual only)', () => {
    const assetId = 'asset-1';
    const trackId = 'track-1';
    const clipId = 'clip-1';

    useProjectStore.setState({
      currentTime: 5,
      assets: {
        [assetId]: {
          id: assetId,
          file: new File([], 'video.mp4'),
          type: 'video',
          name: 'Video 1',
          duration: 10,
          resourceId: 'res-1',
          metadata: { width: 1920, height: 1080 }
        }
      },
      tracks: {
        [trackId]: {
          id: trackId,
          type: 'video',
          clips: [clipId],
          isMuted: true, // Muted
          isLocked: false,
          label: 'Video Track'
        }
      },
      trackOrder: [trackId],
      clips: {
        [clipId]: {
          id: clipId,
          assetId,
          trackId,
          start: 0,
          duration: 10,
          offset: 0,
          type: 'video',
          properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }
        }
      }
    });

    render(<PreviewPanel />);
    expect(screen.queryByTestId('video-player')).toBeInTheDocument();
  });

  test('does not render clips outside current time range', () => {
    const assetId = 'asset-1';
    const trackId = 'track-1';
    const clipId = 'clip-1';

    useProjectStore.setState({
      currentTime: 15, // Outside clip range (0-10)
      assets: {
        [assetId]: {
          id: assetId,
          file: new File([], 'video.mp4'),
          type: 'video',
          name: 'Video 1',
          duration: 10,
          resourceId: 'res-1',
          metadata: { width: 1920, height: 1080 }
        }
      },
      tracks: {
        [trackId]: {
          id: trackId,
          type: 'video',
          clips: [clipId],
          isMuted: false,
          isLocked: false,
          label: 'Video Track'
        }
      },
      trackOrder: [trackId],
      clips: {
        [clipId]: {
          id: clipId,
          assetId,
          trackId,
          start: 0,
          duration: 10,
          offset: 0,
          type: 'video',
          properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }
        }
      }
    });

    render(<PreviewPanel />);
    expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
  });
});
