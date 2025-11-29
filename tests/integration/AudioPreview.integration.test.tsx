import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { PreviewPanel } from '../../src/components/PreviewPanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import { AudioEngine } from '../../src/services/AudioEngine';
import { Asset, Clip, Track } from '../../src/types';

// Integration test for Audio Preview Wiring (M4/M5)
describe('Audio Preview Integration', () => {
    let mockAudioContext: any;
    let mockCreateGain: jest.Mock;
    let mockCreateMediaElementSource: jest.Mock;
    let originalAudioContext: any;
    let registerClipSpy: jest.SpyInstance;

    beforeEach(() => {
        // Reset Store
        useProjectStore.setState({
            assets: {},
            tracks: {},
            clips: {},
            trackOrder: [],
            currentTime: 0,
            isPlaying: false,
            settings: {
                width: 1920,
                height: 1080,
                fps: 30,
                duration: 100,
                previewQuality: 'medium',
                snapToGrid: true,
                allowOverlaps: false,
                simplificationTolerance: 0.0001
            }
        }, true);

        // Reset AudioEngine
        originalAudioContext = window.AudioContext;
        (AudioEngine as any).instance = undefined;

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

        // Spy on AudioEngine methods
        registerClipSpy = jest.spyOn(AudioEngine.prototype, 'registerClip');
    });

    afterEach(() => {
        window.AudioContext = originalAudioContext;
        jest.clearAllMocks();
    });

    it('should register video and audio clips with AudioEngine when rendered', async () => {
        // Setup State
        const videoAsset: Asset = {
            id: 'asset-video',
            name: 'video.mp4',
            type: 'video',
            src: 'blob:video.mp4',
            duration: 10
        };

        const audioAsset: Asset = {
            id: 'asset-audio',
            name: 'music.mp3',
            type: 'audio',
            src: 'blob:music.mp3',
            duration: 10
        };

        const trackVideo: Track = { id: 'track-1', type: 'video', label: 'Video', isMuted: false, isLocked: false, volume: 1.0, clips: ['clip-video'] };
        const trackAudio: Track = { id: 'track-2', type: 'audio', label: 'Audio', isMuted: false, isLocked: false, volume: 1.0, clips: ['clip-audio'] };

        const clipVideo: Clip = {
            id: 'clip-video',
            assetId: videoAsset.id,
            trackId: trackVideo.id,
            start: 0,
            duration: 5,
            offset: 0,
            type: 'video',
            volume: 1.0,
            properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 1 }
        };

        const clipAudio: Clip = {
            id: 'clip-audio',
            assetId: audioAsset.id,
            trackId: trackAudio.id,
            start: 0,
            duration: 5,
            offset: 0,
            type: 'audio',
            volume: 0.8,
            properties: { x: 0, y: 0, width: 0, height: 0, rotation: 0, opacity: 1, zIndex: 1 }
        };

        act(() => {
            const state = useProjectStore.getState();
            state.assets = { [videoAsset.id]: videoAsset, [audioAsset.id]: audioAsset };
            state.tracks = { [trackVideo.id]: trackVideo, [trackAudio.id]: trackAudio };
            state.clips = { [clipVideo.id]: clipVideo, [clipAudio.id]: clipAudio };
            state.trackOrder = [trackVideo.id, trackAudio.id];
            useProjectStore.setState(state);
        });

        // Render
        render(<PreviewPanel />);

        // Verify Registration
        await waitFor(() => {
            // Check that registerClip was called twice
            expect(registerClipSpy).toHaveBeenCalledTimes(2);
        });

        // Verify arguments
        // We can't easily check the element instance, but we can check IDs and volume
        expect(registerClipSpy).toHaveBeenCalledWith(
            'clip-video',
            'track-1',
            expect.any(HTMLVideoElement),
            1.0
        );

        expect(registerClipSpy).toHaveBeenCalledWith(
            'clip-audio',
            'track-2',
            expect.any(HTMLAudioElement),
            0.8
        );
    });
});
