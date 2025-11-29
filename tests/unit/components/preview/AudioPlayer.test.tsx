import React from 'react';
import { render } from '@testing-library/react';
import { AudioPlayer } from '../../../../src/components/preview/AudioPlayer';
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

describe('AudioPlayer', () => {
  const mockClip: Clip = {
    id: 'clip1',
    assetId: 'asset1',
    trackId: 'track1',
    start: 0,
    duration: 10,
    offset: 0,
    type: 'audio',
    volume: 1.0,
    properties: { x: 0, y: 0, width: 0, height: 0, rotation: 0, opacity: 1, zIndex: 1 }
  };

  const mockAsset: Asset = {
    id: 'asset1',
    name: 'music.mp3',
    type: 'audio',
    src: 'http://localhost/music.mp3'
  };

  let playMock: jest.Mock;
  let pauseMock: jest.Mock;

  beforeEach(() => {
    playMock = jest.fn().mockResolvedValue(undefined);
    pauseMock = jest.fn();

    jest.clearAllMocks();

    const originalCreateElement = document.createElement;
    jest.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
        const element = originalCreateElement.call(document, tagName, options);
        if (tagName === 'audio') {
            (element as HTMLAudioElement).play = playMock;
            (element as HTMLAudioElement).pause = pauseMock;
        }
        return element;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders audio element with correct src', () => {
    const { container } = render(
      <AudioPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );
    const audio = container.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveAttribute('src', mockAsset.src);
    expect(audio).toHaveAttribute('crossOrigin', 'anonymous');
  });

  it('seeks audio when currentTime changes', () => {
    const { container, rerender } = render(
      <AudioPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );

    const audio = container.querySelector('audio') as HTMLAudioElement;

    rerender(
      <AudioPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={5}
        isPlaying={false}
        playbackRate={1}
      />
    );

    expect(audio.currentTime).toBe(5);
  });

  it('calls play() when isPlaying becomes true', () => {
    const { rerender, container } = render(
      <AudioPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );

    const audio = container.querySelector('audio') as HTMLAudioElement;
    Object.defineProperty(audio, 'paused', { value: true, configurable: true });
    Object.defineProperty(audio, 'duration', { value: 100, configurable: true });

    rerender(
      <AudioPlayer
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
      <AudioPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={5}
        isPlaying={true}
        playbackRate={1}
      />
    );

    const audio = container.querySelector('audio') as HTMLAudioElement;
    Object.defineProperty(audio, 'paused', { value: false, configurable: true });

    rerender(
      <AudioPlayer
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
      const offsetClip = { ...mockClip, start: 10, offset: 5 };

      const { container } = render(
          <AudioPlayer
            clip={offsetClip}
            asset={mockAsset}
            currentTime={12}
            isPlaying={false}
            playbackRate={1}
          />
      );

      const audio = container.querySelector('audio') as HTMLAudioElement;
      // (12 - 10) + 5 = 7
      expect(audio.currentTime).toBe(7);
  });

  it('updates audio playbackRate', () => {
    const { container, rerender } = render(
      <AudioPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );

    const audio = container.querySelector('audio') as HTMLAudioElement;
    expect(audio.playbackRate).toBe(1);

    rerender(
      <AudioPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={2}
      />
    );

    expect(audio.playbackRate).toBe(2);
  });

  it('registers clip with AudioEngine on mount', () => {
    const { container } = render(
      <AudioPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );
    const audio = container.querySelector('audio');
    expect(mockAudioEngine.registerClip).toHaveBeenCalledWith(
        mockClip.id,
        mockClip.trackId,
        audio,
        mockClip.volume
    );
  });

  it('unregisters clip from AudioEngine on unmount', () => {
    const { unmount } = render(
      <AudioPlayer
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
      <AudioPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );

    const loudClip = { ...mockClip, volume: 1.5 };
    rerender(
      <AudioPlayer
        clip={loudClip}
        asset={mockAsset}
        currentTime={0}
        isPlaying={false}
        playbackRate={1}
      />
    );

    expect(mockAudioEngine.updateClipVolume).toHaveBeenCalledWith(mockClip.id, 1.5);
  });
});
