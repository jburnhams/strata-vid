import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { TimelinePanel } from '../../src/components/TimelinePanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import { AudioEngine } from '../../src/services/AudioEngine';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

describe('Audio Control Integration', () => {
    let mockAudioContext: any;
    let mockCreateGain: jest.Mock;
    let originalAudioContext: any;

    beforeEach(() => {
        // Reset Store correctly preserving actions
        const initialState = useProjectStore.getState();
        useProjectStore.setState({
            ...initialState,
            tracks: {},
            clips: {},
            assets: {},
            trackOrder: [],
            markers: [],
            settings: { ...initialState.settings, duration: 100, snapToGrid: true, allowOverlaps: false },
             currentTime: 0,
             isPlaying: false,
             zoomLevel: 10,
             playbackRate: 1,
        });

        // Reset AudioEngine
        originalAudioContext = window.AudioContext;
        (AudioEngine as any).instance = undefined;

        mockCreateGain = jest.fn(() => ({
            connect: jest.fn(),
            gain: { value: 1 },
            disconnect: jest.fn(),
        }));

        mockAudioContext = {
            createGain: mockCreateGain,
            createMediaElementSource: jest.fn(() => ({ connect: jest.fn(), disconnect: jest.fn() })),
            destination: {},
            state: 'suspended',
            resume: jest.fn().mockResolvedValue(undefined),
        };

        (window as any).AudioContext = jest.fn(() => mockAudioContext);
    });

    afterEach(() => {
        window.AudioContext = originalAudioContext;
    });

    it('should update AudioEngine when track volume changes in UI', async () => {
        // 1. Setup Track
        const trackId = 'track-1';
        act(() => {
            useProjectStore.getState().addTrack({
                id: trackId,
                type: 'video',
                label: 'Video Track',
                isMuted: false,
                isLocked: false,
                volume: 1.0,
                clips: []
            });
        });

        // 2. Render TimelinePanel
        const { getByTitle } = render(<TimelinePanel />);

        // 3. Verify Initial State in Engine
        // Master Gain (0) -> Track Gain (1)
        expect(mockCreateGain).toHaveBeenCalledTimes(2);
        const trackGain = mockCreateGain.mock.results[1].value;
        expect(trackGain.gain.value).toBe(1.0);

        // 4. Change Volume in UI (Input is in %, e.g. 100)
        const volumeInput = getByTitle('Volume %');

        await act(async () => {
            fireEvent.change(volumeInput, { target: { value: '50' } });
        });

        // 5. Verify Store Update
        expect(useProjectStore.getState().tracks[trackId].volume).toBe(0.5);

        // 6. Verify Engine Update
        expect(trackGain.gain.value).toBe(0.5);
    });

    it('should mute AudioEngine when track mute button is clicked', async () => {
        // 1. Setup Track
        const trackId = 'track-1';
         act(() => {
            useProjectStore.getState().addTrack({
                id: trackId,
                type: 'video',
                label: 'Video Track',
                isMuted: false,
                isLocked: false,
                volume: 1.0,
                clips: []
            });
        });

        // 2. Render TimelinePanel
        const { getByTitle } = render(<TimelinePanel />);

        // 3. Verify Initial State in Engine
        const trackGain = mockCreateGain.mock.results[1].value;
        expect(trackGain.gain.value).toBe(1.0);

        // 4. Click Mute
        const muteButton = getByTitle('Mute');
        await act(async () => {
            fireEvent.click(muteButton);
        });

        // 5. Verify Store Update
        expect(useProjectStore.getState().tracks[trackId].isMuted).toBe(true);

        // 6. Verify Engine Update
        expect(trackGain.gain.value).toBe(0);

        // 7. Unmute
        const unmuteButton = getByTitle('Unmute');
        await act(async () => {
            fireEvent.click(unmuteButton);
        });

         // 8. Verify Engine Update (Restored)
        expect(trackGain.gain.value).toBe(1.0);
    });
});
