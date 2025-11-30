import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimelinePanel } from '../../src/components/TimelinePanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import { AudioEngine } from '../../src/services/AudioEngine';
import { DndContext } from '@dnd-kit/core';

// Mock AudioEngine
jest.mock('../../src/services/AudioEngine', () => ({
  AudioEngine: {
    getInstance: jest.fn(() => ({
      registerTrack: jest.fn(),
      registerClip: jest.fn(),
      unregisterClip: jest.fn(),
      updateClipVolume: jest.fn(),
      updateTrackVolume: jest.fn(),
      unregisterTrack: jest.fn(),
    })),
  },
}));

// Mock ResizeObserver for Ruler/Timeline
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Audio Waveform Integration', () => {
  const initialState = useProjectStore.getState();

  beforeEach(() => {
    useProjectStore.setState(initialState, true); // Reset

    // Set up test state
    useProjectStore.setState({
      tracks: {
        'track-1': {
          id: 'track-1',
          type: 'audio',
          label: 'Audio Track',
          isMuted: false,
          isLocked: false,
          volume: 1,
          clips: ['clip-1'],
        },
      },
      clips: {
        'clip-1': {
          id: 'clip-1',
          assetId: 'asset-1',
          trackId: 'track-1',
          start: 0,
          duration: 10,
          offset: 0,
          properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 },
          type: 'audio',
          volume: 1,
        },
      },
      assets: {
        'asset-1': {
          id: 'asset-1',
          name: 'music.mp3',
          type: 'audio',
          src: 'blob:music',
          duration: 100,
          waveform: Array.from({ length: 1000 }, (_, i) => (i % 2 === 0 ? 0.2 : 0.8)),
        },
      },
      trackOrder: ['track-1'],
      settings: { ...initialState.settings, duration: 100 },
      ui: { ...initialState.ui, zoomLevel: 10 },
    });
  });

  it('renders waveform overlay on audio clip in timeline', async () => {
    render(
      <DndContext>
        <TimelinePanel />
      </DndContext>
    );

    // Check if clip item exists
    // We use findBy because virtualization might take a tick or state updates
    const clipItem = await screen.findByTestId('clip-item-clip-1');
    expect(clipItem).toBeInTheDocument();

    // Check for waveform overlay
    // Use 'within' to be specific
    // However, getByTestId is global.
    const waveform = screen.getByTestId('waveform-overlay');
    expect(waveform).toBeInTheDocument();

    // Check SVG path
    const path = waveform.querySelector('path');
    expect(path).toBeInTheDocument();
    // Verify it has content
    expect(path?.getAttribute('d')).toMatch(/^M/);
  });
});
