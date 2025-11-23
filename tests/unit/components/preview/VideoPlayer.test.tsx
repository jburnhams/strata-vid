import React from 'react';
import { render } from '@testing-library/react';
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

  it('applies styles from clip properties', () => {
    const { container } = render(
      <VideoPlayer
        clip={mockClip}
        asset={mockAsset}
        currentTime={5}
        isPlaying={true}
        playbackRate={1}
      />
    );
    const video = container.querySelector('video');
    expect(video).toHaveStyle('position: absolute');
    expect(video).toHaveStyle(`width: ${mockClip.properties.width}%`);
  });
});
