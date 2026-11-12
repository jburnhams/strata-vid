import { renderWithStrata } from 'strata-react/testing';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';
import { AssetLoader } from '../../src/services/AssetLoader';

jest.mock('../../src/services/AssetLoader');

describe('Playback Integration', () => {
  beforeEach(() => {
    // Reset store
    useProjectStore.setState({
      assets: {},
      tracks: {},
      clips: {},
      trackOrder: [],
      selectedAssetId: null,
      currentTime: 0,
      isPlaying: false,
      settings: { width: 1920, height: 1080, fps: 30, duration: 100, assets: {}, tracks: {} } as any,
      playbackRate: 1
    });

    // Mock HTMLMediaElement methods
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: jest.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: jest.fn(),
    });
    // Mock duration to avoid NaN issues
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
        configurable: true,
        value: 100,
    });
  });

  it('completes a playback workflow: Play -> Timer Update -> Pause -> Scrub', async () => {
    // Setup AssetLoader mock
    const mockAsset = {
      id: 'video1',
      type: 'video',
      src: 'http://localhost/video.mp4',
      duration: 10,
      resourceId: 'res1'
    };
    (AssetLoader.loadAsset as jest.Mock).mockResolvedValue(mockAsset);

    // Seed Store
    act(() => {
        const store = useProjectStore.getState();
        store.addAsset(mockAsset as any);
        store.addTrack({ id: 'track1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: [] });
        store.addClip({
            id: 'clip1',
            assetId: 'video1',
            trackId: 'track1',
            start: 0,
            duration: 10,
            offset: 0,
            type: 'video',
            properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 }
        });
    });

    renderWithStrata(<App />);

    // 1. Check Initial State
    // Using accessible queries now
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
    expect(useProjectStore.getState().isPlaying).toBe(false);

    // 2. Start Playback
    jest.useFakeTimers();

    await act(async () => {
        fireEvent.click(screen.getByLabelText('Play'));
    });

    expect(useProjectStore.getState().isPlaying).toBe(true);
    expect(screen.getByLabelText('Pause')).toBeInTheDocument();

    // 3. Advance Time
    // We need to advance timers to trigger requestAnimationFrame
    await act(async () => {
        jest.advanceTimersByTime(1000); // Advance 1 second
    });

    // Check if time updated
    // Note: implementation depends on performance.now().
    // If Jest mocks performance.now() correctly, it should work.
    const currentTime = useProjectStore.getState().currentTime;
    expect(currentTime).toBeGreaterThan(0);
    // Ideally close to 1.0, but loop implementation might vary slightly with fake timers.

    // 4. Pause
    await act(async () => {
        fireEvent.click(screen.getByLabelText('Pause'));
    });
    expect(useProjectStore.getState().isPlaying).toBe(false);

    // 5. Scrub via Keyboard
    const timeBeforeScrub = useProjectStore.getState().currentTime;

    await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight' }));
    });

    const timeAfterScrub = useProjectStore.getState().currentTime;
    expect(timeAfterScrub).toBeGreaterThan(timeBeforeScrub);

    // 6. Scrub with the timeline's current-time slider (the ruler's marker), by keyboard
    const scrubber = screen.getByRole('slider', { name: 'Current time' });
    await act(async () => {
        fireEvent.keyDown(scrubber, { key: 'Home' });
    });
    expect(useProjectStore.getState().currentTime).toBe(0);
    await act(async () => {
        fireEvent.keyDown(scrubber, { key: 'PageUp' });
    });
    expect(useProjectStore.getState().currentTime).toBeGreaterThan(0);

    // 7. Stop Button
    // Advance time a bit to make sure we are not at 0
    await act(async () => {
        useProjectStore.setState({ isPlaying: true, currentTime: 10 });
    });

    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    });

    expect(useProjectStore.getState().isPlaying).toBe(false);
    expect(useProjectStore.getState().currentTime).toBe(0);

    jest.useRealTimers();
  });
});
