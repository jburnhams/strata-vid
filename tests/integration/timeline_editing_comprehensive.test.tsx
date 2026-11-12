import { renderWithStrata } from 'strata-react/testing';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../../src/App';
import { dragBy, timelineItem } from '../utils/timeline';
import { useProjectStore } from '../../src/store/useProjectStore';

global.URL.createObjectURL = jest.fn(() => 'mock-url');

describe('Comprehensive Timeline Editing Integration', () => {
    beforeEach(() => {
        // Reset store
        useProjectStore.setState({
            tracks: {
                'track-1': {
                    id: 'track-1',
                    type: 'video',
                    label: 'Video Track 1',
                    isMuted: false,
                    isLocked: false,
                    clips: ['clip-1']
                }
            },
            clips: {
                'clip-1': {
                    id: 'clip-1',
                    assetId: 'asset-1',
                    trackId: 'track-1',
                    start: 10,
                    duration: 5,
                    offset: 0,
                    properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
                    type: 'video'
                }
            },
            assets: {
                'asset-1': {
                    id: 'asset-1',
                    name: 'test.mp4',
                    duration: 60,
                    type: 'video',
                    src: 'mock-url',
                    thumbnail: 'mock-thumb-url'
                }
            },
            trackOrder: ['track-1'],
            settings: {
                width: 1920,
                height: 1080,
                fps: 30,
                duration: 100,
                previewQuality: 'high',
                snapToGrid: true,
                allowOverlaps: false
            },
            zoomLevel: 10 // 10px per second
        });

        // Mock clientWidth
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
            configurable: true,
            get() { return 1000; }
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('displays thumbnail on clip', () => {
        renderWithStrata(<App />);
        const thumb = screen.getByTestId('clip-thumbnail');
        expect(thumb).toBeInTheDocument();
        expect(thumb).toHaveStyle({ backgroundImage: 'url(mock-thumb-url)' });
    });

    it('toggles snapping and affects drag behavior', () => {
        renderWithStrata(<App />);

        // Snapping on: dragged to 0.5s, the clip snaps to the playhead at 0s
        act(() => dragBy(timelineItem('test.mp4'), -95));
        expect(useProjectStore.getState().clips['clip-1'].start).toBe(0);

        act(() => {
            useProjectStore.setState(state => {
                state.clips['clip-1'].start = 10;
            });
        });

        // Snapping off: it stays where it was dropped
        fireEvent.click(screen.getByRole('button', { name: 'Snap' }));
        act(() => dragBy(timelineItem('test.mp4'), -95));
        expect(useProjectStore.getState().clips['clip-1'].start).toBe(0.5);
    });

    it('toggles overlap permission and affects drag behavior', () => {
        renderWithStrata(<App />);

        act(() => {
             useProjectStore.setState(state => {
                 state.clips['clip-2'] = {
                     id: 'clip-2',
                     assetId: 'asset-1',
                     trackId: 'track-1',
                     start: 30,
                     duration: 5,
                     offset: 0,
                     properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
                     type: 'video'
                 };
                 state.tracks['track-1'].clips.push('clip-2');
                 state.settings.snapToGrid = false;
             });
        });

        // Overlaps off: a move onto the next clip (10s to 27s) is refused and says why
        act(() => dragBy(screen.getAllByRole('button', { name: /^test\.mp4, 0:10/ })[0], 170));
        expect(useProjectStore.getState().clips['clip-1'].start).toBe(10);

        // Overlaps on: the same move is made
        fireEvent.click(screen.getByRole('button', { name: 'Allow overlaps' }));
        act(() => dragBy(screen.getAllByRole('button', { name: /^test\.mp4, 0:10/ })[0], 170));
        expect(useProjectStore.getState().clips['clip-1'].start).toBe(27);
    });
});
