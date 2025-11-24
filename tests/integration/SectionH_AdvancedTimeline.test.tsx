import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from '@jest/globals';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';
import { Clip, Track } from '../../src/types';

// Mock map
jest.mock('../../src/components/MapPanel', () => ({
  MapPanel: () => <div data-testid="map-panel-mock">Map</div>
}));

// Mock AudioContext
Object.defineProperty(window, 'AudioContext', {
  value: class {
    createGain = () => ({ connect: jest.fn(), gain: { value: 0 } });
    createOscillator = () => ({ connect: jest.fn(), start: jest.fn(), stop: jest.fn() });
    destination = {};
    close = jest.fn();
  }
});

const resetStore = () => {
    useProjectStore.setState({
        assets: {},
        tracks: {},
        clips: {},
        trackOrder: [],
        markers: [],
        currentTime: 0,
        isPlaying: false,
        settings: {
            width: 1920, height: 1080, fps: 30, duration: 60,
            previewQuality: 'medium', snapToGrid: true, allowOverlaps: false
        },
        toasts: [],
        isLoading: false,
        loadingMessage: null
    });
};

describe('Section H: Advanced Timeline Features', () => {
    beforeEach(() => {
        resetStore();
        // Setup initial state: 1 Track, 1 Clip
        const track: Track = { id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: ['c1'] };
        const clip: Clip = {
            id: 'c1', assetId: 'a1', trackId: 't1',
            start: 0, duration: 10, offset: 0,
            type: 'video',
            properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 }
        };
        useProjectStore.setState(state => ({
            ...state,
            tracks: { t1: track },
            clips: { c1: clip },
            trackOrder: ['t1'],
            assets: {
                'a1': { id: 'a1', name: 'video.mp4', type: 'video', src: 'blob:video' }
            }
        }));
    });

    it('Markers: can add via UI and jump to marker', async () => {
        render(<App />);

        // 1. Add Marker at 0s
        const addMarkerBtn = screen.getByText('+ Marker');
        fireEvent.click(addMarkerBtn);

        // Verify marker rendered
        // Marker component has title="Label (Time)"
        // Label is 'M'
        let markerEl = await screen.findByTitle('M (0.00s)');
        expect(markerEl).toBeInTheDocument();

        // 2. Add Marker at 5s
        // Mock store update for time (as playback loop is mocked/not running automatically)
        await act(async () => {
            useProjectStore.getState().setPlaybackState({ currentTime: 5 });
        });
        fireEvent.click(addMarkerBtn);

        markerEl = await screen.findByTitle('M (5.00s)');
        expect(markerEl).toBeInTheDocument();

        // 3. Jump to marker
        // Move time away
        useProjectStore.getState().setPlaybackState({ currentTime: 2 });

        // Click first marker (0s)
        const marker0 = screen.getByTitle('M (0.00s)');
        fireEvent.click(marker0);

        // Verify time jumped
        expect(useProjectStore.getState().currentTime).toBe(0);
    });

    it('Filters: render in Preview', async () => {
        // Update clip filter via store
        useProjectStore.getState().updateClipProperties('c1', { filter: 'grayscale(1)' });

        render(<App />);

        // Find video element
        const videoEl = document.querySelector('video');
        expect(videoEl).toBeInTheDocument();
        expect(videoEl?.style.filter).toBe('grayscale(1)');
    });

    it('Speed: affects VideoPlayer playbackRate', async () => {
        // Change speed via store
        useProjectStore.getState().updateClipPlaybackRate('c1', 2);

        render(<App />);

        const videoEl = document.querySelector('video') as HTMLVideoElement;

        // Wait for useEffect
        await new Promise(r => setTimeout(r, 10)); // clear tick

        // Note: VideoPlayer uses global playbackRate * clipRate. Global default is 1.
        expect(videoEl.playbackRate).toBe(2);
    });
});
