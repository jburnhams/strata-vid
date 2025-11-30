import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelinePanel } from '../../src/components/TimelinePanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import { Track, Clip, Asset } from '../../src/types';
import { DndContext } from '@dnd-kit/core';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock AudioEngine
jest.mock('../../src/services/AudioEngine', () => ({
  AudioEngine: {
    getInstance: () => ({
      registerTrack: jest.fn(),
      updateTrackVolume: jest.fn(),
      setMasterVolume: jest.fn(),
    }),
  },
}));

describe('Track View Mode Integration', () => {
  beforeEach(() => {
    const state = useProjectStore.getState();
    useProjectStore.setState({
      ...state,
      tracks: {},
      clips: {},
      assets: {},
      trackOrder: [],
      settings: {
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 100,
        previewQuality: 'medium',
        snapToGrid: true,
        allowOverlaps: false,
        simplificationTolerance: 0.0001
      },
      zoomLevel: 10,
    });
  });

  const setupTest = () => {
    const trackId = 'track-1';
    const clipId = 'clip-1';
    const assetId = 'asset-1';

    const track: Track = {
      id: trackId,
      type: 'video',
      label: 'Video Track',
      isMuted: false,
      isLocked: false,
      volume: 1.0,
      clips: [clipId],
      viewMode: 'frames',
    };

    const asset: Asset = {
      id: assetId,
      name: 'test-video.mp4',
      type: 'video',
      duration: 10,
      format: 'mp4',
      thumbnail: 'blob:thumbnail',
      waveform: [0.1, 0.5, 0.9, 0.2],
    };

    const clip: Clip = {
      id: clipId,
      assetId: assetId,
      trackId: trackId,
      start: 0,
      duration: 10,
      offset: 0,
      properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
      type: 'video',
      volume: 1.0,
    };

    const state = useProjectStore.getState();
    state.addAsset(asset);
    state.addTrack(track);
    state.addClip(clip);

    return { trackId, clipId, assetId };
  };

  test('toggles track view mode and updates rendering', async () => {
    setupTest();

    render(
      <DndContext>
        <TimelinePanel />
      </DndContext>
    );

    // Initial State: View Mode is 'frames' (default)
    // Expect at least one thumbnail
    const thumbnails = screen.getAllByTestId('clip-thumbnail');
    expect(thumbnails.length).toBeGreaterThan(0);

    // Check for waveform overlay (should be absent)
    expect(screen.queryByTestId('waveform-overlay')).not.toBeInTheDocument();

    const toggleButton = screen.getByTitle('Show Video Frames Only');
    expect(toggleButton).toBeInTheDocument();

    // Click to toggle -> 'waveform'
    fireEvent.click(toggleButton);

    expect(useProjectStore.getState().tracks['track-1'].viewMode).toBe('waveform');

    const toggleButtonWaveform = screen.getByTitle('Show Waveform Only');
    expect(toggleButtonWaveform).toBeInTheDocument();

    expect(screen.queryByTestId('clip-thumbnail')).not.toBeInTheDocument();
    const waveforms = screen.getAllByTestId('waveform-overlay');
    expect(waveforms.length).toBeGreaterThan(0);

    // Click to toggle -> 'both'
    fireEvent.click(toggleButtonWaveform);

    expect(useProjectStore.getState().tracks['track-1'].viewMode).toBe('both');

    const toggleButtonBoth = screen.getByTitle('Show Both Video and Waveform');
    expect(toggleButtonBoth).toBeInTheDocument();

    expect(screen.getAllByTestId('clip-thumbnail').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('waveform-overlay').length).toBeGreaterThan(0);

    // Click to toggle -> 'frames'
    fireEvent.click(toggleButtonBoth);

    expect(useProjectStore.getState().tracks['track-1'].viewMode).toBe('frames');

    expect(screen.getByTitle('Show Video Frames Only')).toBeInTheDocument();
    expect(screen.getAllByTestId('clip-thumbnail').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('waveform-overlay')).not.toBeInTheDocument();
  });

  test('audio tracks always show waveform regardless of viewMode', () => {
    const trackId = 'track-audio';
    const clipId = 'clip-audio';
    const assetId = 'asset-audio';

    const track: Track = {
      id: trackId,
      type: 'audio',
      label: 'Audio Track',
      isMuted: false,
      isLocked: false,
      volume: 1.0,
      clips: [clipId],
    };

     const asset: Asset = {
      id: assetId,
      name: 'test-audio.mp3',
      type: 'audio',
      duration: 10,
      format: 'mp3',
      waveform: [0.1, 0.5],
    };

    const clip: Clip = {
      id: clipId,
      assetId: assetId,
      trackId: trackId,
      start: 0,
      duration: 10,
      offset: 0,
      properties: { x: 0, y: 0, width: 0, height: 0, rotation: 0, opacity: 1, zIndex: 0 },
      type: 'audio',
      volume: 1.0,
    };

    const state = useProjectStore.getState();
    state.addAsset(asset);
    state.addTrack(track);
    state.addClip(clip);

    render(
      <DndContext>
        <TimelinePanel />
      </DndContext>
    );

    const overlays = screen.getAllByTestId('waveform-overlay');
    expect(overlays.length).toBeGreaterThan(0);

    // Should NOT show toggle button in header
    expect(screen.queryByTitle('Show Video Frames Only')).not.toBeInTheDocument();
  });
});
