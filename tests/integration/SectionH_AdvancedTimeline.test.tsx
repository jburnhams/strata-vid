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
        await act(async () => {
           fireEvent.click(addMarkerBtn);
        });

        // Verify marker rendered
        let markerEl = await screen.findByTitle('M (0.00s)');
        expect(markerEl).toBeInTheDocument();

        // 2. Add Marker at 5s
        await act(async () => {
            useProjectStore.getState().setPlaybackState({ currentTime: 5 });
        });
        await act(async () => {
           fireEvent.click(addMarkerBtn);
        });

        markerEl = await screen.findByTitle('M (5.00s)');
        expect(markerEl).toBeInTheDocument();

        // 3. Jump to marker
        await act(async () => {
           useProjectStore.getState().setPlaybackState({ currentTime: 2 });
        });

        const marker0 = screen.getByTitle('M (0.00s)');
        await act(async () => {
           fireEvent.click(marker0);
        });

        expect(useProjectStore.getState().currentTime).toBe(0);
    });

    it('Filters: render in Preview', async () => {
        useProjectStore.getState().updateClipProperties('c1', { filter: 'grayscale(1)' });
        render(<App />);
        const videoEl = document.querySelector('video');
        expect(videoEl).toBeInTheDocument();
        expect(videoEl?.style.filter).toBe('grayscale(1)');
    });

    it('Speed: affects VideoPlayer playbackRate', async () => {
        useProjectStore.getState().updateClipPlaybackRate('c1', 2);
        render(<App />);
        const videoEl = document.querySelector('video') as HTMLVideoElement;
        await new Promise(r => setTimeout(r, 10)); // clear tick
        expect(videoEl.playbackRate).toBe(2);
    });

    it('Duplicate Clip: duplicates clip via Context Menu', async () => {
        render(<App />);

        const clipEl = screen.getByTestId('clip-item-c1');
        fireEvent.contextMenu(clipEl);

        const duplicateOption = screen.getByText('Duplicate Clip');
        await act(async () => {
            fireEvent.click(duplicateOption);
        });

        // Should have 2 clips now. One at 0-10, one at 10-20.
        const clips = useProjectStore.getState().clips;
        expect(Object.keys(clips).length).toBe(2);

        // Find the new clip
        const newClip = Object.values(clips).find(c => c.id !== 'c1');
        expect(newClip).toBeDefined();
        expect(newClip?.start).toBe(10);
    });

    it('Split Clip: splits clip via Context Menu', async () => {
        render(<App />);

        // Move playhead to 5s
        await act(async () => {
            useProjectStore.getState().setPlaybackState({ currentTime: 5 });
        });

        const clipEl = screen.getByTestId('clip-item-c1');
        fireEvent.contextMenu(clipEl);

        const splitOption = screen.getByText('Split Clip');
        // Option should be enabled
        expect(splitOption).not.toBeDisabled();

        await act(async () => {
            fireEvent.click(splitOption);
        });

        // Should have 2 clips: c1 (0-5), new (5-10)
        const clips = useProjectStore.getState().clips;
        expect(Object.keys(clips).length).toBe(2);
        expect(clips['c1'].duration).toBe(5);

        const newClip = Object.values(clips).find(c => c.id !== 'c1');
        expect(newClip?.start).toBe(5);
        expect(newClip?.duration).toBe(5);
    });

    it('Ripple Delete: removes clip and shifts subsequent clips', async () => {
        // Setup: c1 (0-5), c2 (5-10)
        const c2: Clip = {
            id: 'c2', assetId: 'a1', trackId: 't1',
            start: 5, duration: 5, offset: 0,
            type: 'video',
            properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 }
        };
        useProjectStore.setState(state => {
            if (state.clips['c1']) state.clips['c1'].duration = 5;
            state.clips['c2'] = c2;
            state.tracks['t1'].clips = ['c1', 'c2'];
            return state;
        });

        render(<App />);

        const clip1El = screen.getByTestId('clip-item-c1');
        fireEvent.contextMenu(clip1El);

        const rippleDeleteOption = screen.getByText('Ripple Delete');
        await act(async () => {
            fireEvent.click(rippleDeleteOption);
        });

        const state = useProjectStore.getState();
        expect(state.clips['c1']).toBeUndefined();
        expect(state.clips['c2'].start).toBe(0); // Shifted from 5 to 0
    });

    it('Transitions: adds crossfade via Context Menu', async () => {
         // Setup: c1 (0-10), c2 (10-20)
        const c2: Clip = {
            id: 'c2', assetId: 'a1', trackId: 't1',
            start: 10, duration: 10, offset: 0,
            type: 'video',
            properties: { x:0, y:0, width:100, height:100, rotation:0, opacity:1, zIndex:0 }
        };
        useProjectStore.setState(state => {
            state.clips['c2'] = c2;
            state.tracks['t1'].clips = ['c1', 'c2'];
            return state;
        });

        render(<App />);

        const clip2El = screen.getByTestId('clip-item-c2');
        fireEvent.contextMenu(clip2El);

        const fadeOption = screen.getByText('Add Crossfade (1s)');
        await act(async () => {
            fireEvent.click(fadeOption);
        });

        const state = useProjectStore.getState();
        // c2 should have transitionIn and start at 9
        expect(state.clips['c2'].transitionIn).toEqual({ type: 'crossfade', duration: 1 });
        expect(state.clips['c2'].start).toBe(9);
    });
});
