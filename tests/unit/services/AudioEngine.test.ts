import { AudioEngine } from '../../../src/services/AudioEngine';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('AudioEngine', () => {
  let originalAudioContext: any;
  let mockAudioContext: any;
  let mockDestination: any;
  let mockCreateGain: jest.Mock;
  let mockCreateMediaElementSource: jest.Mock;

  beforeEach(() => {
    // Save original
    originalAudioContext = window.AudioContext;

    // Setup mocks
    mockDestination = {};

    // Factory for GainNodes. Each call returns a new mock object.
    mockCreateGain = jest.fn(() => ({
      connect: jest.fn(),
      gain: { value: 1 },
      disconnect: jest.fn(),
    }));

    mockCreateMediaElementSource = jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
    }));

    mockAudioContext = {
      createGain: mockCreateGain,
      createMediaElementSource: mockCreateMediaElementSource,
      destination: mockDestination,
      state: 'suspended',
      resume: jest.fn().mockResolvedValue(undefined),
    };

    // Mock the constructor
    (window as any).AudioContext = jest.fn(() => mockAudioContext);

    // Reset singleton instance
    (AudioEngine as any).instance = undefined;
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
  });

  it('should be a singleton', () => {
    const instance1 = AudioEngine.getInstance();
    const instance2 = AudioEngine.getInstance();
    expect(instance1).toBe(instance2);
    expect(window.AudioContext).toHaveBeenCalledTimes(1);
  });

  it('should initialize AudioContext and MasterGain', () => {
    AudioEngine.getInstance();
    expect(window.AudioContext).toHaveBeenCalled();
    expect(mockCreateGain).toHaveBeenCalled();

    // 0: Master Gain
    const masterGain = mockCreateGain.mock.results[0].value;
    expect(masterGain.connect).toHaveBeenCalledWith(mockDestination);
  });

  it('should register a track and create a gain node', () => {
    const engine = AudioEngine.getInstance();

    // 0: Master Gain
    const masterGain = mockCreateGain.mock.results[0].value;

    engine.registerTrack('track-1', 0.8, false);

    expect(mockCreateGain).toHaveBeenCalledTimes(2); // Master + Track

    // 1: Track Gain
    const trackGain = mockCreateGain.mock.results[1].value;

    expect(trackGain.connect).toHaveBeenCalledWith(masterGain);
    expect(trackGain.gain.value).toBe(0.8);
  });

  it('should update track volume and mute state', () => {
    const engine = AudioEngine.getInstance();
    engine.registerTrack('track-1', 0.8, false);

    // 1: Track Gain
    const trackGain = mockCreateGain.mock.results[1].value;
    expect(trackGain.gain.value).toBe(0.8);

    // Update volume
    engine.updateTrackVolume('track-1', 0.5, false);
    expect(trackGain.gain.value).toBe(0.5);

    // Mute
    engine.updateTrackVolume('track-1', 0.5, true);
    expect(trackGain.gain.value).toBe(0);

    // Unmute
    engine.updateTrackVolume('track-1', 0.5, false);
    expect(trackGain.gain.value).toBe(0.5);
  });

  it('should register a clip and connect to track', () => {
    const engine = AudioEngine.getInstance();
    engine.registerTrack('track-1', 1.0, false);

    const mockElement = document.createElement('video');

    engine.registerClip('clip-1', 'track-1', mockElement, 0.7);

    expect(mockCreateMediaElementSource).toHaveBeenCalledWith(mockElement);
    expect(mockCreateGain).toHaveBeenCalledTimes(3);
    // 0: Master, 1: Track, 2: Clip

    const trackGain = mockCreateGain.mock.results[1].value;
    const clipGain = mockCreateGain.mock.results[2].value;

    expect(clipGain.gain.value).toBe(0.7);

    const sourceNode = mockCreateMediaElementSource.mock.results[0].value;
    expect(sourceNode.connect).toHaveBeenCalledWith(clipGain);

    expect(clipGain.connect).toHaveBeenCalledWith(trackGain);
  });

  it('should update clip volume', () => {
    const engine = AudioEngine.getInstance();
    engine.registerTrack('track-1', 1.0, false);
    const mockElement = document.createElement('video');
    engine.registerClip('clip-1', 'track-1', mockElement, 0.7);

    // 2: Clip Gain
    const clipGain = mockCreateGain.mock.results[2].value;

    engine.updateClipVolume('clip-1', 0.9);
    expect(clipGain.gain.value).toBe(0.9);
  });

  it('should unregister clip and disconnect nodes', () => {
    const engine = AudioEngine.getInstance();
    engine.registerTrack('track-1', 1.0, false);
    const mockElement = document.createElement('video');
    engine.registerClip('clip-1', 'track-1', mockElement, 0.7);

    const sourceNode = mockCreateMediaElementSource.mock.results[0].value;
    // 2: Clip Gain
    const clipGain = mockCreateGain.mock.results[2].value;

    engine.unregisterClip('clip-1');

    expect(sourceNode.disconnect).toHaveBeenCalled();
    expect(clipGain.disconnect).toHaveBeenCalled();

    expect(engine.getDebugInfo().clips).toBe(0);
  });

  it('should resume context', async () => {
    const engine = AudioEngine.getInstance();
    await engine.resumeContext();
    expect(mockAudioContext.resume).toHaveBeenCalled();
  });

  it('should reuse source node if registering same element twice', () => {
    const engine = AudioEngine.getInstance();
    engine.registerTrack('track-1', 1.0, false);
    const mockElement = document.createElement('video');

    // First registration
    engine.registerClip('clip-1', 'track-1', mockElement, 0.7);
    expect(mockCreateMediaElementSource).toHaveBeenCalledTimes(1);

    // Second registration (same element)
    engine.registerClip('clip-1', 'track-1', mockElement, 0.8);

    // Should NOT call createMediaElementSource again
    expect(mockCreateMediaElementSource).toHaveBeenCalledTimes(1);

    // 0: Master, 1: Track, 2: Clip1, 3: Clip2
    expect(mockCreateGain).toHaveBeenCalledTimes(4);

    const sourceNode = mockCreateMediaElementSource.mock.results[0].value;
    expect(sourceNode.disconnect).toHaveBeenCalled(); // Should have disconnected from old clip gain
  });
});
