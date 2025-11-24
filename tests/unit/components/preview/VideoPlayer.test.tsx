import React from 'react';
import { render, act } from '@testing-library/react';
import { VideoPlayer } from '../../../../src/components/preview/VideoPlayer';
import { Clip, Asset } from '../../../../src/types';

describe('VideoPlayer', () => {
  const mockClip: Clip = {
    id: 'clip1',
    assetId: 'asset1',
    trackId: 'track1',
    start: 0,
    duration: 10,
    offset: 0,
    type: 'video',
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
    jest.clearAllMocks();
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
});
