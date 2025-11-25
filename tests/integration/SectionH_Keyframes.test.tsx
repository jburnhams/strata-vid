import React from 'react';
import { render, act } from '@testing-library/react';
import { PreviewPanel } from '../../src/components/PreviewPanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('../../src/hooks/usePlaybackLoop', () => ({
  usePlaybackLoop: jest.fn()
}));

// Mock MapPanel
jest.mock('../../src/components/MapPanel', () => ({
  MapPanel: () => <div data-testid="map-panel" />
}));

describe('Section H: Keyframe Animation Integration', () => {

  beforeAll(() => {
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

  it('interpolates opacity based on keyframes', () => {
    act(() => {
        useProjectStore.setState({
            currentTime: 5, // 5s global time
            trackOrder: ['track1'],
            tracks: {
                track1: { id: 'track1', type: 'video', label: 'Video', isMuted: false, isLocked: false, clips: ['clip1'] }
            },
            clips: {
                clip1: {
                    id: 'clip1', trackId: 'track1', assetId: 'asset1',
                    start: 0, duration: 10, offset: 0, type: 'video',
                    properties: {
                        x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1
                    },
                    keyframes: {
                        opacity: [
                            { id: 'k1', time: 0, value: 0, easing: 'linear' },
                            { id: 'k2', time: 10, value: 1, easing: 'linear' }
                        ]
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

    // Time 5s. Clip starts at 0. Relative time 5s.
    // Keyframes: 0 -> 0, 10 -> 1.
    // At 5s, opacity should be 0.5.
    expect(video).toHaveStyle('opacity: 0.5');
  });

  it('interpolates rotation with easing', () => {
      act(() => {
          useProjectStore.setState({
              currentTime: 5, // 5s global time
              trackOrder: ['track1'],
              tracks: {
                  track1: { id: 'track1', type: 'video', label: 'Video', isMuted: false, isLocked: false, clips: ['clip1'] }
              },
              clips: {
                  clip1: {
                      id: 'clip1', trackId: 'track1', assetId: 'asset1',
                      start: 0, duration: 10, offset: 0, type: 'video',
                      properties: {
                          x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1
                      },
                      keyframes: {
                          rotation: [
                              { id: 'k1', time: 0, value: 0, easing: 'ease-in' }, // t*t
                              { id: 'k2', time: 10, value: 100, easing: 'linear' }
                          ]
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

      // Time 5s. Duration 10s. Progress 0.5.
      // Ease-in: 0.5 * 0.5 = 0.25.
      // Value: 0 + (100 - 0) * 0.25 = 25.
      expect(video).toHaveStyle('transform: rotate(25deg)');
  });
});
