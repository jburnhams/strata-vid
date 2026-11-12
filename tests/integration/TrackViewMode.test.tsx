import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithStrata } from 'strata-react/testing';
import { TimelinePanel } from '../../src/components/TimelinePanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import type { Track, Clip, Asset } from '../../src/types';

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

  test('switches what clips show from the track settings', async () => {
    setupTest();

    renderWithStrata(<TimelinePanel />);

    // Frames by default: thumbnails, no waveform
    expect(screen.getAllByTestId('clip-thumbnail').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('waveform-overlay')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Video Track settings' }));
    await screen.findByRole('dialog', { name: 'Video Track settings' });

    fireEvent.click(screen.getByRole('radio', { name: 'Waveform' }));
    expect(useProjectStore.getState().tracks['track-1'].viewMode).toBe('waveform');
    expect(screen.queryByTestId('clip-thumbnail')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('waveform-overlay').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('radio', { name: 'Both' }));
    expect(useProjectStore.getState().tracks['track-1'].viewMode).toBe('both');
    expect(screen.getAllByTestId('clip-thumbnail').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('waveform-overlay').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('radio', { name: 'Frames' }));
    expect(useProjectStore.getState().tracks['track-1'].viewMode).toBe('frames');
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

    renderWithStrata(<TimelinePanel />);

    const overlays = screen.getAllByTestId('waveform-overlay');
    expect(overlays.length).toBeGreaterThan(0);

    // Audio tracks have no choice of what clips show
    fireEvent.click(screen.getByRole('button', { name: 'Audio Track settings' }));
    expect(screen.queryByRole('radiogroup', { name: 'Clips show' })).not.toBeInTheDocument();
  });
});
