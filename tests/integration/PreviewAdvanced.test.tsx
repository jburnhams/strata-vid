import React from 'react';
import { render, fireEvent, act, screen } from '@testing-library/react';
import { PreviewPanel } from '../../src/components/PreviewPanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('../../src/hooks/usePlaybackLoop', () => ({
  usePlaybackLoop: jest.fn()
}));

// Mock MapPanel to avoid complex Leaflet interactions in this test
jest.mock('../../src/components/MapPanel', () => ({
  MapPanel: () => <div data-testid="map-panel" />
}));

describe('PreviewAdvanced Integration', () => {

  beforeAll(() => {
    // Mock HTMLMediaElement methods for VideoPlayer
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: jest.fn().mockImplementation(() => Promise.resolve())
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: jest.fn()
    });
  });

  beforeEach(() => {
    act(() => {
      useProjectStore.setState({
        currentTime: 0,
        isPlaying: false,
        trackOrder: [],
        tracks: {},
        clips: {},
        assets: {},
        settings: {
            width: 1920,
            height: 1080,
            fps: 30,
            duration: 100,
            previewQuality: 'high',
            snapToGrid: true,
            allowOverlaps: false,
        },
      });
    });
  });

  describe('Video Clip Properties', () => {
    it('applies transform properties to video element', () => {
        act(() => {
            useProjectStore.setState({
                currentTime: 5,
                trackOrder: ['track1'],
                tracks: {
                    track1: { id: 'track1', type: 'video', label: 'Video', isMuted: false, isLocked: false, clips: ['clip1'] }
                },
                clips: {
                    clip1: {
                        id: 'clip1', trackId: 'track1', assetId: 'asset1',
                        start: 0, duration: 10, offset: 0, type: 'video',
                        properties: {
                            x: 10,
                            y: 20,
                            width: 50,
                            height: 50,
                            rotation: 45,
                            opacity: 0.8,
                            zIndex: 1
                        }
                    }
                },
                assets: {
                    asset1: { id: 'asset1', name: 'vid.mp4', type: 'video', src: 'vid.mp4' }
                }
            });
        });

        const { container } = render(<PreviewPanel />);
        const video = container.querySelector('video') as HTMLVideoElement;

        expect(video).toBeInTheDocument();
        // Check inline styles
        expect(video).toHaveStyle('left: 10%');
        expect(video).toHaveStyle('top: 20%');
        expect(video).toHaveStyle('width: 50%');
        expect(video).toHaveStyle('height: 50%');
        expect(video).toHaveStyle('transform: rotate(45deg)');
        expect(video).toHaveStyle('opacity: 0.8');
        expect(video).toHaveStyle('z-index: 1');
    });
  });

  describe('Image Clip Rendering', () => {
      it('renders image overlay with correct properties', () => {
          act(() => {
              useProjectStore.setState({
                  currentTime: 5,
                  trackOrder: ['track1'],
                  tracks: {
                      track1: { id: 'track1', type: 'overlay', label: 'Image', isMuted: false, isLocked: false, clips: ['clip1'] }
                  },
                  clips: {
                      clip1: {
                          id: 'clip1', trackId: 'track1', assetId: 'asset1',
                          start: 0, duration: 10, offset: 0, type: 'image',
                          properties: {
                              x: 0,
                              y: 0,
                              width: 100,
                              height: 100,
                              rotation: 0,
                              opacity: 1,
                              zIndex: 1
                          }
                      }
                  },
                  assets: {
                      asset1: { id: 'asset1', name: 'pic.png', type: 'image', src: 'pic.png' }
                  }
              });
          });

          const { container } = render(<PreviewPanel />);
          const img = container.querySelector('img');

          expect(img).toBeInTheDocument();
          expect(img).toHaveAttribute('src', 'pic.png');

          // Image is wrapped in a div that holds the style
          const wrapper = img!.parentElement;
          expect(wrapper).toHaveStyle('width: 100%');
          expect(wrapper).toHaveStyle('height: 100%');
      });
  });

  describe('Safe Area Guides', () => {
      it('toggles safe area guides on button click', () => {
          render(<PreviewPanel />);

          // Initially hidden
          expect(screen.queryByTestId('guide-action-safe')).not.toBeInTheDocument();

          // Click Toggle Button
          const toggleBtn = screen.getByTitle('Toggle Safe Areas');
          fireEvent.click(toggleBtn);

          // Now visible
          expect(screen.getByTestId('guide-action-safe')).toBeInTheDocument();
          expect(screen.getByTestId('guide-title-safe')).toBeInTheDocument();

          // Click again to hide
          fireEvent.click(toggleBtn);
          expect(screen.queryByTestId('guide-action-safe')).not.toBeInTheDocument();
      });

      it('toggles grid on button click', () => {
          render(<PreviewPanel />);

          // Initially hidden
          expect(screen.queryByTestId('guide-grid-v1')).not.toBeInTheDocument();

          // Click Grid Button
          const gridBtn = screen.getByTitle('Toggle Grid');
          fireEvent.click(gridBtn);

          // Now visible
          expect(screen.getByTestId('guide-grid-v1')).toBeInTheDocument();

          // Click again to hide
          fireEvent.click(gridBtn);
          expect(screen.queryByTestId('guide-grid-v1')).not.toBeInTheDocument();
      });
  });

  describe('Mixed Composition', () => {
      it('renders video and image simultaneously', () => {
           act(() => {
              useProjectStore.setState({
                  currentTime: 5,
                  trackOrder: ['track1', 'track2'],
                  tracks: {
                      track1: { id: 'track1', type: 'video', label: 'V', isMuted: false, isLocked: false, clips: ['clip1'] },
                      track2: { id: 'track2', type: 'overlay', label: 'O', isMuted: false, isLocked: false, clips: ['clip2'] }
                  },
                  clips: {
                      clip1: {
                          id: 'clip1', trackId: 'track1', assetId: 'vid1',
                          start: 0, duration: 10, offset: 0, type: 'video',
                          properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 }
                      },
                      clip2: {
                          id: 'clip2', trackId: 'track2', assetId: 'img1',
                          start: 0, duration: 10, offset: 0, type: 'image',
                          properties: { x: 50, y: 50, width: 20, height: 20, rotation: 0, opacity: 1, zIndex: 2 }
                      }
                  },
                  assets: {
                      vid1: { id: 'vid1', name: 'v.mp4', type: 'video', src: 'v.mp4' },
                      img1: { id: 'img1', name: 'i.png', type: 'image', src: 'i.png' }
                  }
              });
          });

          const { container } = render(<PreviewPanel />);

          expect(container.querySelector('video')).toBeInTheDocument();
          expect(container.querySelector('img')).toBeInTheDocument();
      });
  });

  describe('Transitions', () => {
    it('applies crossfade transition to video', () => {
        act(() => {
            useProjectStore.setState({
                currentTime: 1, // 1s into transition
                trackOrder: ['track1'],
                tracks: {
                    track1: { id: 'track1', type: 'video', label: 'V', isMuted: false, isLocked: false, clips: ['clip1'] }
                },
                clips: {
                    clip1: {
                        id: 'clip1', trackId: 'track1', assetId: 'vid1',
                        start: 0, duration: 10, offset: 0, type: 'video',
                        properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 },
                        transitionIn: { type: 'crossfade', duration: 2 }
                    }
                },
                assets: {
                    vid1: { id: 'vid1', name: 'v.mp4', type: 'video', src: 'v.mp4' }
                }
            });
        });

        const { container } = render(<PreviewPanel />);
        const video = container.querySelector('video') as HTMLVideoElement;

        // Progress = 1s / 2s = 0.5. Opacity = 1 * 0.5 = 0.5
        expect(video).toHaveStyle('opacity: 0.5');
    });

    it('applies wipe transition to image', () => {
        act(() => {
            useProjectStore.setState({
                currentTime: 1, // 1s into transition
                trackOrder: ['track1'],
                tracks: {
                    track1: { id: 'track1', type: 'overlay', label: 'O', isMuted: false, isLocked: false, clips: ['clip1'] }
                },
                clips: {
                    clip1: {
                        id: 'clip1', trackId: 'track1', assetId: 'img1',
                        start: 0, duration: 10, offset: 0, type: 'image',
                        properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 },
                        transitionIn: { type: 'wipe', duration: 2 }
                    }
                },
                assets: {
                    img1: { id: 'img1', name: 'i.png', type: 'image', src: 'i.png' }
                }
            });
        });

        const { container } = render(<PreviewPanel />);
        const img = container.querySelector('img');
        const wrapper = img!.parentElement;

        // Progress = 0.5. Wipe 50%.
        // clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%)
        expect(wrapper).toHaveStyle('clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%)');
    });
  });
});
