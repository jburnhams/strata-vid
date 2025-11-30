import { AudioEngine } from '../../../src/services/AudioEngine';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('AudioEngine Coverage', () => {
    let originalAudioContext: any;

    beforeEach(() => {
        originalAudioContext = window.AudioContext;
        // Reset instance
        (AudioEngine as any).instance = undefined;
    });

    afterEach(() => {
        window.AudioContext = originalAudioContext;
        jest.restoreAllMocks();
    });

    it('should handle missing Web Audio API', () => {
        (window as any).AudioContext = undefined;
        (window as any).webkitAudioContext = undefined;
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const engine = AudioEngine.getInstance();
        expect(engine.getContext()).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('Web Audio API not supported in this browser.');
    });

    it('should warn if resumeContext fails', async () => {
        const mockResume = jest.fn().mockRejectedValue(new Error('Resume failed'));
        const mockAudioContext = {
            createGain: jest.fn(() => ({ connect: jest.fn(), gain: {}, disconnect: jest.fn() })),
            destination: {},
            state: 'suspended',
            resume: mockResume
        };
        (window as any).AudioContext = jest.fn(() => mockAudioContext);

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const engine = AudioEngine.getInstance();
        await engine.resumeContext();

        expect(consoleSpy).toHaveBeenCalledWith('Failed to resume AudioContext:', expect.any(Error));
    });

    it('should warn if createMediaElementSource fails', () => {
        const mockAudioContext = {
            createGain: jest.fn(() => ({ connect: jest.fn(), gain: {}, disconnect: jest.fn() })),
            createMediaElementSource: jest.fn(() => { throw new Error('Failed'); }),
            destination: {},
            state: 'running'
        };
        (window as any).AudioContext = jest.fn(() => mockAudioContext);
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const engine = AudioEngine.getInstance();
        engine.registerTrack('t1', 1, false);
        const el = document.createElement('video');

        engine.registerClip('c1', 't1', el, 1);

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to create'), expect.any(Error));
    });

    it('should unregister track', () => {
        const mockDisconnect = jest.fn();
        const mockAudioContext = {
            createGain: jest.fn(() => ({ connect: jest.fn(), gain: {}, disconnect: mockDisconnect })),
            destination: {},
            state: 'running'
        };
        (window as any).AudioContext = jest.fn(() => mockAudioContext);

        const engine = AudioEngine.getInstance();
        engine.registerTrack('t1', 1, false);
        engine.unregisterTrack('t1');

        expect(mockDisconnect).toHaveBeenCalled();
        expect(engine.getDebugInfo().tracks).toBe(0);
    });

    it('should update master volume', () => {
         const mockGain = { value: 1 };
         const mockMasterGain = { connect: jest.fn(), gain: mockGain, disconnect: jest.fn() };
         const mockAudioContext = {
            createGain: jest.fn(() => mockMasterGain),
            destination: {},
            state: 'running'
        };
        (window as any).AudioContext = jest.fn(() => mockAudioContext);

        const engine = AudioEngine.getInstance();
        engine.updateMasterVolume(0.5);
        expect(mockGain.value).toBe(0.5);
    });

    it('should handle error during unregisterClip disconnect', () => {
        const mockDisconnect = jest.fn().mockImplementation(() => { throw new Error('Disconnect failed'); });
        const mockAudioContext = {
            createGain: jest.fn(() => ({ connect: jest.fn(), gain: {}, disconnect: mockDisconnect })),
            createMediaElementSource: jest.fn(() => ({ connect: jest.fn(), disconnect: mockDisconnect })),
            destination: {},
            state: 'running'
        };
        (window as any).AudioContext = jest.fn(() => mockAudioContext);
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const engine = AudioEngine.getInstance();
        engine.registerTrack('t1', 1, false);
        const el = document.createElement('video');
        engine.registerClip('c1', 't1', el, 1);

        engine.unregisterClip('c1');

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error disconnecting'), expect.any(Error));
    });

    it('should update clip volume', () => {
         const mockGainParam = { value: 1 };
         const mockClipGain = { connect: jest.fn(), gain: mockGainParam, disconnect: jest.fn() };
         const mockAudioContext = {
            createGain: jest.fn()
                .mockReturnValueOnce({ connect: jest.fn(), gain: {}, disconnect: jest.fn() }) // master
                .mockReturnValueOnce({ connect: jest.fn(), gain: { value: 0 }, disconnect: jest.fn() }) // track
                .mockReturnValueOnce(mockClipGain), // clip
            createMediaElementSource: jest.fn(() => ({ connect: jest.fn(), disconnect: jest.fn() })),
            destination: {},
            state: 'running'
        };
        (window as any).AudioContext = jest.fn(() => mockAudioContext);

        const engine = AudioEngine.getInstance();
        engine.registerTrack('t1', 1, false);
        const el = document.createElement('video');
        engine.registerClip('c1', 't1', el, 1);

        engine.updateClipVolume('c1', 0.8);
        expect(mockGainParam.value).toBe(0.8);
    });

    it('should update track volume', () => {
         const mockGainParam = { value: 1 };
         const mockTrackGain = { connect: jest.fn(), gain: mockGainParam, disconnect: jest.fn() };
         const mockAudioContext = {
            createGain: jest.fn()
                .mockReturnValueOnce({ connect: jest.fn(), gain: {}, disconnect: jest.fn() }) // master
                .mockReturnValueOnce(mockTrackGain), // track
            destination: {},
            state: 'running'
        };
        (window as any).AudioContext = jest.fn(() => mockAudioContext);

        const engine = AudioEngine.getInstance();
        engine.registerTrack('t1', 1, false);

        engine.updateTrackVolume('t1', 0.5, false);
        expect(mockGainParam.value).toBe(0.5);

        engine.updateTrackVolume('t1', 0.5, true);
        expect(mockGainParam.value).toBe(0);
    });
});
