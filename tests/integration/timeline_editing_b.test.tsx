import { renderWithStrata } from 'strata-react/testing';
import React from 'react';
import { fireEvent } from '@testing-library/react';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';
import { dragBy, timelineItem } from '../utils/timeline';

// Mock Browser APIs
global.URL.createObjectURL = jest.fn(() => 'mock-url');

// Mock components/hooks that might interfere
jest.mock('../../src/hooks/useAutoSave', () => ({
    useAutoSave: () => ({ state: { status: 'saved', at: null }, saveNow: async () => {} })
}));

// Mock mediabunny just in case
jest.mock('mediabunny', () => ({
    Input: class {},
    Output: class {}
}));

describe('Section B: Timeline Editing Integration', () => {
    beforeEach(() => {
        // Reset store and populate with test data
        useProjectStore.setState({
            assets: {
                'asset-1': { id: 'asset-1', name: 'video.mp4', type: 'video', duration: 100, src: 'mock-url', file: new File([], 'v.mp4') }
            },
            tracks: {
                'track-1': { id: 'track-1', type: 'video', label: 'Video Track', isMuted: false, isLocked: false, clips: ['clip-1'] }
            },
            clips: {
                'clip-1': {
                    id: 'clip-1',
                    assetId: 'asset-1',
                    trackId: 'track-1',
                    start: 10,
                    duration: 10,
                    offset: 0,
                    properties: { x: 0, y: 0, width: 1, height: 1, rotation: 0, opacity: 1, zIndex: 1 },
                    type: 'video'
                }
            },
            trackOrder: ['track-1'],
            currentTime: 0,
            zoomLevel: 10 // 10px per second
        });
    });

    it('trims the end of a clip by dragging its right edge', () => {
        renderWithStrata(<App />);

        // The edges are the timeline's own pointer handles beside the clip's button
        const clip = timelineItem('video.mp4');
        const [, endEdge] = clip.parentElement!.querySelectorAll('span.cursor-ew-resize');
        if (!endEdge) throw new Error('End edge not found');

        // +20px at 10px a second is +2 seconds
        dragBy(endEdge, 20);

        expect(useProjectStore.getState().clips['clip-1'].duration).toBe(12);
        expect(useProjectStore.getState().clips['clip-1'].start).toBe(10);
    });

    it('trims the end of a clip from the keyboard', () => {
        renderWithStrata(<App />);

        fireEvent.keyDown(timelineItem('video.mp4'), { key: 'ArrowRight', altKey: true });

        expect(useProjectStore.getState().clips['clip-1'].duration).toBeGreaterThan(10);
        expect(useProjectStore.getState().clips['clip-1'].start).toBe(10);
    });
});
