import React from 'react';
import { render, act } from '@testing-library/react';
import { PreviewPanel } from '../../src/components/PreviewPanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import '@testing-library/jest-dom';

// Mock usePlaybackLoop
jest.mock('../../src/hooks/usePlaybackLoop', () => ({
  usePlaybackLoop: jest.fn()
}));

describe('PreviewRendering Integration', () => {

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
    Object.defineProperty(HTMLMediaElement.prototype, 'load', {
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
            previewQuality: 'high'
        },
      });
    });
  });

  it('renders multi-track composition with correct stacking', () => {
    act(() => {
      useProjectStore.setState({
        currentTime: 5,
        trackOrder: ['track1', 'track2'], // track2 is on top
        tracks: {
          track1: { id: 'track1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: ['clip1'] },
          track2: { id: 'track2', type: 'overlay', label: 'V2', isMuted: false, isLocked: false, clips: ['clip2'] }
        },
        clips: {
          clip1: {
            id: 'clip1', trackId: 'track1', assetId: 'asset1',
            start: 0, duration: 10, offset: 0, type: 'video',
            properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 }
          },
          clip2: {
            id: 'clip2', trackId: 'track2', assetId: 'asset2',
            start: 0, duration: 10, offset: 0, type: 'text', content: 'Top Text',
            properties: { x: 0, y: 0, width: 50, height: 50, rotation: 0, opacity: 1, zIndex: 1 }
          }
        },
        assets: {
          asset1: { id: 'asset1', name: 'vid.mp4', type: 'video', src: 'vid.mp4' },
          asset2: { id: 'asset2', name: 'text', type: 'image', src: '' }
        }
      });
    });

    const { container, getByText } = render(<PreviewPanel />);

    const video = container.querySelector('video');
    const text = getByText('Top Text');

    expect(video).toBeInTheDocument();
    expect(text).toBeInTheDocument();

    // Verify stacking order: text should be after video in DOM
    const comparison = video!.compareDocumentPosition(text);
    expect(comparison & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('applies text styling correctly', () => {
     act(() => {
      useProjectStore.setState({
        currentTime: 5,
        trackOrder: ['track1'],
        tracks: {
          track1: { id: 'track1', type: 'overlay', label: 'Text', isMuted: false, isLocked: false, clips: ['clip1'] }
        },
        clips: {
          clip1: {
            id: 'clip1', trackId: 'track1', assetId: 'asset1',
            start: 0, duration: 10, offset: 0, type: 'text', content: 'Styled',
            properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 },
            textStyle: {
                fontFamily: 'Courier New',
                fontSize: 50,
                fontWeight: 'bold',
                color: '#00ff00',
                textAlign: 'center',
                backgroundColor: '#000000'
            }
          }
        },
        assets: {
            asset1: { id: 'asset1', name: 'text', type: 'image', src: '' }
        }
      });
    });

    const { getByText } = render(<PreviewPanel />);
    const text = getByText('Styled');

    // Check styles on the paragraph element
    expect(text).toHaveStyle('font-family: Courier New');
    expect(text).toHaveStyle('font-size: 50px');
    expect(text).toHaveStyle('color: #00ff00');
    expect(text).toHaveStyle('background-color: #000000');
  });

  it('updates scaling when quality changes', () => {
     act(() => {
      useProjectStore.setState({
        settings: { width: 1920, height: 1080, fps: 30, duration: 100, previewQuality: 'low' }
      });
    });

    const { getByTestId } = render(<PreviewPanel />);
    const scaler = getByTestId('preview-scaler');

    // Low = 0.5 render scale -> 2.0 display scale
    expect(scaler).toHaveStyle('transform: scale(2)');
    expect(scaler).toHaveStyle('width: 50%');

    // Change to High
    act(() => {
        useProjectStore.setState((state) => ({
            settings: { ...state.settings, previewQuality: 'high' }
        }));
    });

    expect(scaler).toHaveStyle('transform: scale(1)');
    expect(scaler).toHaveStyle('width: 100%');
  });
});
