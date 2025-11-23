import React from 'react';
import { render, act } from '@testing-library/react';
import { PreviewPanel } from '../../src/components/PreviewPanel';
import { useProjectStore } from '../../src/store/useProjectStore';

// Mock child components
jest.mock('../../src/components/preview/VideoPlayer', () => ({
  VideoPlayer: ({ clip }: any) => <div data-testid={`video-${clip.id}`}>Video Player</div>
}));
jest.mock('../../src/components/preview/OverlayRenderer', () => ({
  OverlayRenderer: ({ clip }: any) => <div data-testid={`overlay-${clip.id}`}>Overlay Renderer</div>
}));
jest.mock('../../src/hooks/usePlaybackLoop', () => ({
  usePlaybackLoop: jest.fn()
}));

describe('PreviewPanel Integration', () => {
  beforeEach(() => {
    act(() => {
      useProjectStore.setState({
        currentTime: 5,
        isPlaying: false,
        trackOrder: ['track1', 'track2'],
        tracks: {
          track1: { id: 'track1', type: 'video', label: 'Video Track', isMuted: false, isLocked: false, clips: ['clip1'] },
          track2: { id: 'track2', type: 'overlay', label: 'Overlay Track', isMuted: false, isLocked: false, clips: ['clip2'] }
        },
        clips: {
          clip1: {
            id: 'clip1', trackId: 'track1', assetId: 'asset1',
            start: 0, duration: 10, offset: 0, type: 'video',
            properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 }
          },
          clip2: {
            id: 'clip2', trackId: 'track2', assetId: 'asset2',
            start: 4, duration: 5, offset: 0, type: 'text', content: 'Overlay',
            properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 2 }
          }
        },
        assets: {
          asset1: { id: 'asset1', name: 'video.mp4', type: 'video', src: 'video.mp4' },
          asset2: { id: 'asset2', name: 'text', type: 'image', src: '' } // Dummy asset for text
        }
      });
    });
  });

  it('renders active clips at current time', () => {
    const { getByTestId } = render(<PreviewPanel />);

    // At time 5:
    // clip1 (0-10) is active
    // clip2 (4-9) is active
    expect(getByTestId('video-clip1')).toBeInTheDocument();
    expect(getByTestId('overlay-clip2')).toBeInTheDocument();
  });

  it('does not render inactive clips', () => {
    act(() => {
        useProjectStore.setState({ currentTime: 2 });
    });

    const { queryByTestId, getByTestId } = render(<PreviewPanel />);

    // At time 2:
    // clip1 (0-10) is active
    // clip2 (4-9) is NOT active
    expect(getByTestId('video-clip1')).toBeInTheDocument();
    expect(queryByTestId('overlay-clip2')).not.toBeInTheDocument();
  });
});
