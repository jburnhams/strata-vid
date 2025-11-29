import { AudioEngine } from '../../src/services/AudioEngine';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Integration test for AudioSystem (M3)
describe('Audio System Integration', () => {
    let mockAudioContext: any;
    let mockCreateGain: jest.Mock;
    let mockCreateMediaElementSource: jest.Mock;
    let originalAudioContext: any;

    beforeEach(() => {
        originalAudioContext = window.AudioContext;

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
            destination: {},
            state: 'suspended',
            resume: jest.fn().mockResolvedValue(undefined),
        };

        (window as any).AudioContext = jest.fn(() => mockAudioContext);
        (AudioEngine as any).instance = undefined;
    });

    afterEach(() => {
        window.AudioContext = originalAudioContext;
    });

    it('should handle a full playback session lifecycle', async () => {
        const engine = AudioEngine.getInstance();

        // 1. User opens project -> Initialize
        // Master Gain created (Index 0)
        const masterGain = mockCreateGain.mock.results[0].value;

        // 2. Timeline loads tracks
        const track1Id = 'video-track';
        const track2Id = 'music-track';

        engine.registerTrack(track1Id, 1.0, false);
        engine.registerTrack(track2Id, 0.5, false);

        // Track Gains: Index 1, 2
        const track1Gain = mockCreateGain.mock.results[1].value;
        const track2Gain = mockCreateGain.mock.results[2].value;

        expect(track1Gain.gain.value).toBe(1.0);
        expect(track2Gain.gain.value).toBe(0.5);

        // 3. User hits Play -> Resume Context
        await engine.resumeContext();
        expect(mockAudioContext.resume).toHaveBeenCalled();

        // 4. Clips become active (virtualization/VideoPlayer mount)
        const vid1 = document.createElement('video');
        const audio1 = document.createElement('video'); // Simulating audio clip with video element

        engine.registerClip('clip-v1', track1Id, vid1, 1.0);
        engine.registerClip('clip-a1', track2Id, audio1, 0.8);

        // Clip Gains: Index 3, 4
        const clipV1Gain = mockCreateGain.mock.results[3].value;
        const clipA1Gain = mockCreateGain.mock.results[4].value;

        expect(clipV1Gain.gain.value).toBe(1.0);
        expect(clipA1Gain.gain.value).toBe(0.8);

        // Check routing
        // clipV1 -> track1 -> Master
        // clipA1 -> track2 -> Master
        expect(clipV1Gain.connect).toHaveBeenCalledWith(track1Gain);
        expect(clipA1Gain.connect).toHaveBeenCalledWith(track2Gain);
        expect(track1Gain.connect).toHaveBeenCalledWith(masterGain);
        expect(track2Gain.connect).toHaveBeenCalledWith(masterGain);

        // 5. User mutes music track
        engine.updateTrackVolume(track2Id, 0.5, true);
        expect(track2Gain.gain.value).toBe(0);

        // 6. User moves playhead, clip-v1 scrolls out (unregisters)
        engine.unregisterClip('clip-v1');
        const sourceV1 = mockCreateMediaElementSource.mock.results[0].value;
        expect(sourceV1.disconnect).toHaveBeenCalled();
        expect(clipV1Gain.disconnect).toHaveBeenCalled();

        // 7. User unmutes music
        engine.updateTrackVolume(track2Id, 0.5, false);
        expect(track2Gain.gain.value).toBe(0.5);

        // 8. Re-register same element (e.g. scroll back)
        engine.registerClip('clip-v1', track1Id, vid1, 1.0);
        // Should reuse source, create new gain (Index 5)
        expect(mockCreateMediaElementSource).toHaveBeenCalledTimes(2); // Only 2 total (v1, a1)
        expect(mockCreateGain).toHaveBeenCalledTimes(6); // 0..5

        const clipV1GainNew = mockCreateGain.mock.results[5].value;
        expect(sourceV1.connect).toHaveBeenCalledWith(clipV1GainNew);
    });
});
