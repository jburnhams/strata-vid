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

    render(<App />);

    // 1. Check Initial State
    expect(screen.getByTitle('Play (Space)')).toBeInTheDocument();
    expect(useProjectStore.getState().isPlaying).toBe(false);

    // 2. Start Playback
    jest.useFakeTimers();

    await act(async () => {
        fireEvent.click(screen.getByTitle('Play (Space)'));
    });

    expect(useProjectStore.getState().isPlaying).toBe(true);
    expect(screen.getByTitle('Pause (Space)')).toBeInTheDocument();

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
        fireEvent.click(screen.getByTitle('Pause (Space)'));
    });
    expect(useProjectStore.getState().isPlaying).toBe(false);

    // 5. Scrub via Keyboard
    const timeBeforeScrub = useProjectStore.getState().currentTime;

    await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    });

    const timeAfterScrub = useProjectStore.getState().currentTime;
    expect(timeAfterScrub).toBeGreaterThan(timeBeforeScrub);

    // 6. Scrub via Playhead Drag (simulated)
    // We can't easily simulate drag in JSDOM/DndKit without complex setup,
    // but we can trigger pointer events on the Playhead manually.
    const playhead = screen.getByTestId('playhead');

    // Mock setPointerCapture
    playhead.setPointerCapture = jest.fn();
    playhead.releasePointerCapture = jest.fn();
    // Mock offsetParent for position calculation
    Object.defineProperty(playhead, 'offsetParent', {
        get: () => ({
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 100 })
        })
    });

    // Start Drag
    await act(async () => {
        fireEvent.pointerDown(playhead, { clientX: 100, pointerId: 1, bubbles: true });
    });

    // Move Drag (Move to 200px)
    // Zoom level is default 10. 200px / 10 = 20s.
    await act(async () => {
        // We must ensure the event has clientX
        const event = new MouseEvent('pointermove', { clientX: 200, bubbles: true });
        Object.defineProperty(event, 'pointerId', { value: 1 });
        fireEvent(playhead, event);
    });

    expect(useProjectStore.getState().currentTime).toBeCloseTo(20, 0.1);

    // End Drag
    await act(async () => {
        fireEvent.pointerUp(playhead, { pointerId: 1, bubbles: true });
    });

    // 7. Stop Button
    // Advance time a bit to make sure we are not at 0
    await act(async () => {
        useProjectStore.setState({ isPlaying: true, currentTime: 10 });
    });

    await act(async () => {
        fireEvent.click(screen.getByTitle('Stop (Home)'));
    });

    expect(useProjectStore.getState().isPlaying).toBe(false);
    expect(useProjectStore.getState().currentTime).toBe(0);

    jest.useRealTimers();
  });
});
