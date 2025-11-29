import React from 'react';
import { render, act } from '@testing-library/react';
import { VideoPlayer } from '../../../../src/components/preview/VideoPlayer';
import { Clip, Asset } from '../../../../src/types';
import { AudioEngine } from '../../../../src/services/AudioEngine';

// Mock AudioEngine
const mockAudioEngine = {
  registerClip: jest.fn(),
  unregisterClip: jest.fn(),
  updateClipVolume: jest.fn(),
};

jest.mock('../../../../src/services/AudioEngine', () => ({
  AudioEngine: {
    getInstance: jest.fn(() => mockAudioEngine)
  }
}));

describe('VideoPlayer', () => {
  const mockClip: Clip = {
    id: 'clip1',
    assetId: 'asset1',
    trackId: 'track1',
    start: 0,
    duration: 10,
    offset: 0,
    type: 'video',
    volume: 1.0,
    properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 }
  };

  const mockAsset: Asset = {
    id: 'asset1',
    name: 'video.mp4',
    type: 'video',
    src: 'http://localhost/video.mp4'
  };

  let playMock: jest.Mock;
  let pauseMock: jest.Mock;

  beforeEach(() => {
    playMock = jest.fn().mockResolvedValue(undefined);
    pauseMock = jest.fn();

    // Reset AudioEngine mocks
    jest.clearAllMocks();

    // Setup mocks on the video element instance because setup.tsx might override prototype methods
    // by assigning to the instance directly.
    const originalCreateElement = document.createElement;
    jest.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
        const element = originalCreateElement.call(document, tagName, options);
        if (tagName === 'video') {
            // Override the instance methods with our test spies
            (element as HTMLVideoElement).play = playMock;
            (element as HTMLVideoElement).pause = pauseMock;
        }
        return element;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Restore document.createElement
  });

  it('renders video element with correct src', () => {
    const { container } = render(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', mockAsset.src);
  });

  it('seeks video when currentTime changes', () => {
    const { container, rerender } = render(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );

    const video = container.querySelector('video') as HTMLVideoElement;

    // Update time
    rerender(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={5}
        isPlaying={false}
        playbackRate={1}
      />
    );

    expect(video.currentTime).toBe(5);
  });

  it('calls play() when isPlaying becomes true', () => {
    const { rerender, container } = render(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );

    // Set paused property manually to mock state
    const video = container.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'paused', { value: true, configurable: true });
    Object.defineProperty(video, 'duration', { value: 100, configurable: true });

    rerender(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0.1}
        isPlaying={true}
        playbackRate={1}
      />
    );

    expect(playMock).toHaveBeenCalled();
  });

  it('calls play() even when duration is NaN (metadata not loaded)', () => {
    const { rerender, container } = render(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );

    // Set paused property and duration to NaN to simulate metadata not loaded
    const video = container.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'paused', { value: true, configurable: true });
    Object.defineProperty(video, 'duration', { value: NaN, configurable: true });

    rerender(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0.1}
        isPlaying={true}
        playbackRate={1}
      />
    );

    // Should still call play() even when duration is NaN
    expect(playMock).toHaveBeenCalled();
  });

  it('calls pause() when isPlaying becomes false', () => {
    const { rerender, container } = render(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={5}
        isPlaying={true}
        playbackRate={1}
      />
    );

    // Set paused property manually to mock state (playing)
    const video = container.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'paused', { value: false, configurable: true });

    rerender(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={5.1}
        isPlaying={false}
        playbackRate={1}
      />
    );

    expect(pauseMock).toHaveBeenCalled();
  });

  it('handles clip offset and start time correctly', () => {
      // Clip starts at 10s on timeline, but has 5s offset (starts 5s into video)
      const offsetClip = { ...mockClip, start: 10, offset: 5 };

      const { container } = render(
          <VideoPlayer
            clip={offsetClip}
            asset={mockAsset}
            currentTime={12} // 2 seconds into clip
            isPlaying={false}
            playbackRate={1}
          />
      );

      const video = container.querySelector('video') as HTMLVideoElement;
      // Expected video time = (Current - Start) + Offset = (12 - 10) + 5 = 7
      expect(video.currentTime).toBe(7);
  });

  it('updates video playbackRate', () => {
    const { container, rerender } = render(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );

    const video = container.querySelector('video') as HTMLVideoElement;
    // Note: JSDOM might default playbackRate to 1.
    expect(video.playbackRate).toBe(1);

    rerender(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={2}
      />
    );

    expect(video.playbackRate).toBe(2);
  });

  it('applies crossfade opacity', () => {
    const transitionClip: Clip = {
      ...mockClip,
      start: 0,
      duration: 10,
      transitionIn: { type: 'crossfade', duration: 2 }
    };

    const { container } = render(
      <VideoPlayer
        clip={transitionClip}
        asset={mockAsset}
        currentTime={1} // 50% progress (1/2)
        isPlaying={false}
        playbackRate={1}
      />
    );

    const video = container.querySelector('video') as HTMLVideoElement;
    // opacity: 1 * 0.5 = 0.5
    expect(video.style.opacity).toBe('0.5');
  });

  it('applies wipe clip-path', () => {
    const transitionClip: Clip = {
      ...mockClip,
      start: 0,
      duration: 10,
      transitionIn: { type: 'wipe', duration: 2 }
    };

    const { container } = render(
      <VideoPlayer
        clip={transitionClip}
        asset={mockAsset}
        currentTime={1} // 50% progress
        isPlaying={false}
        playbackRate={1}
      />
    );

    const video = container.querySelector('video') as HTMLVideoElement;
    // 50% wipe
    expect(video.style.clipPath).toBe('polygon(0 0, 50% 0, 50% 100%, 0 100%)');
  });

  it('updates video playbackRate based on global rate and clip rate', () => {
    const clipWithRate = { ...mockClip, playbackRate: 2 };
    const { container } = render(
      <VideoPlayer
        clip={clipWithRate}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1.5}
      />
    );

    const video = container.querySelector('video') as HTMLVideoElement;
    // 1.5 * 2 = 3
    expect(video.playbackRate).toBe(3);
  });

  it('calculates seek time correctly with clip playbackRate', () => {
    const clipWithRate = { ...mockClip, start: 10, offset: 5, playbackRate: 2 };

    const { container } = render(
      <VideoPlayer
        clip={clipWithRate}
        asset={mockAsset}
        currentTime={12} // 2 seconds into clip
        isPlaying={false}
        playbackRate={1}
      />
    );

    const video = container.querySelector('video') as HTMLVideoElement;
    // Expected video time = (Current - Start) * Rate + Offset
    // (12 - 10) * 2 + 5 = 4 + 5 = 9
    expect(video.currentTime).toBe(9);
  });

  it('applies filter style', () => {
    const clipWithFilter = {
      ...mockClip,
      properties: { ...mockClip.properties, filter: 'blur(5px)' },
    };

    const { container } = render(
      <VideoPlayer
        clip={clipWithFilter}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );

    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video.style.filter).toBe('blur(5px)');
  });

  it('interpolates properties based on keyframes', () => {
    const clipWithKeyframes: Clip = {
      ...mockClip,
      keyframes: {
        opacity: [
          { id: 'k1', time: 0, value: 0, easing: 'linear' },
          { id: 'k2', time: 5, value: 1, easing: 'linear' },
        ],
      },
      volume: 1.0,
    };

    const { container } = render(
      <VideoPlayer
        clip={clipWithKeyframes}
        asset={mockAsset}
        currentTime={2.5} // 2.5s into a 10s clip, 50% progress
        isPlaying={false}
        playbackRate={1}
      />
    );

    const video = container.querySelector('video') as HTMLVideoElement;
    // (2.5s is halfway between time 0 and 5, so opacity should be 0.5)
    expect(video.style.opacity).toBe('0.5');
  });

  // Audio Engine Tests
  it('registers clip with AudioEngine on mount', () => {
    const { container } = render(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );
    const video = container.querySelector('video');
    expect(mockAudioEngine.registerClip).toHaveBeenCalledWith(
        mockClip.id,
        mockClip.trackId,
        video,
        mockClip.volume
    );
  });

  it('unregisters clip from AudioEngine on unmount', () => {
    const { unmount } = render(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );

    unmount();
    expect(mockAudioEngine.unregisterClip).toHaveBeenCalledWith(mockClip.id);
  });

  it('updates audio volume when clip volume changes', () => {
    const { rerender } = render(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );

    // Change volume
    const loudClip = { ...mockClip, volume: 1.5 };
    rerender(
      <VideoPlayer
        clip={loudClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );

    expect(mockAudioEngine.updateClipVolume).toHaveBeenCalledWith(mockClip.id, 1.5);
  });

  it('sets crossOrigin and removes muted attribute', () => {
      const { container } = render(
        <VideoPlayer
          clip={mockClip}
          asset={mockAsset}
          currentTime={0}
          isPlaying={false}
          playbackRate={1}
        />
      );

      const video = container.querySelector('video');
      expect(video).toHaveAttribute('crossOrigin', 'anonymous');
      // Should not be muted (or property muted should be false)
      // JSDOM 'muted' attribute maps to property.
      // If we remove the attribute in React, it shouldn't be there.
      expect(video).not.toHaveAttribute('muted');
      // Property check
      expect((video as HTMLVideoElement).muted).toBe(false);
  });
});
