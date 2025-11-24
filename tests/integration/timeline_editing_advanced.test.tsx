import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TimelinePanel } from '../../src/components/TimelinePanel';
import { useProjectStore } from '../../src/store/useProjectStore';

// Mocks
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Timeline Editing Integration', () => {
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
                    properties: {},
                    type: 'video'
                }
            },
            trackOrder: ['track-1'],
            selectedClipId: null,
            // Asset needs to exist for safety if components look it up,
            // though ClipItem doesn't seem to use asset directly except for type/duration
            // but ClipItem uses 'clip' prop.
            assets: {
                'asset-1': {
                    id: 'asset-1',
                    name: 'test.mp4',
                    duration: 60,
                    type: 'video',
                    src: 'mock-url',
                    gpxData: undefined,
                    resourceId: 'r1'
                }
            }
        });

        // Mock clientWidth for TimelineContainer logic
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
            configurable: true,
            get() { return 1000; }
        });
    });

    afterEach(() => {
         jest.restoreAllMocks();
    });

    it('can select and delete a clip via context menu', async () => {
        render(<TimelinePanel />);

        // Find clip
        const clipElement = screen.getByText('clip-1').closest('div');
        expect(clipElement).toBeInTheDocument();

        // Right click
        fireEvent.contextMenu(clipElement!);

        // Check context menu
        const deleteOption = screen.getByText('Delete Clip');
        expect(deleteOption).toBeInTheDocument();

        // Click delete
        fireEvent.click(deleteOption);

        // Verify clip is gone from UI
        expect(screen.queryByText('clip-1')).not.toBeInTheDocument();

        // Verify store
        expect(useProjectStore.getState().clips['clip-1']).toBeUndefined();
    });

    it('can zoom to fit', () => {
        render(<TimelinePanel />);

        // Initial check: The slider or text shows 10px
        expect(screen.getByText('10px')).toBeInTheDocument();

        const fitBtn = screen.getByTitle('Zoom to Fit');
        fireEvent.click(fitBtn);

        // Max time = 10+5 = 15. Buffer 10% = 16.5.
        // Width 1000. Zoom = 1000/16.5 = 60.606...
        // Round to 61

        expect(screen.getByText('61px')).toBeInTheDocument();
    });

    it('can delete selected clip via keyboard shortcut', () => {
        render(<TimelinePanel />);

        // Click to select
        const clipElement = screen.getByText('clip-1').closest('div');
        fireEvent.click(clipElement!);

        // Verify selection state in store
        expect(useProjectStore.getState().selectedClipId).toBe('clip-1');

        // Press Delete key
        fireEvent.keyDown(window, { key: 'Delete' });

        // Verify clip is gone
        expect(useProjectStore.getState().clips['clip-1']).toBeUndefined();
    });

    it('can duplicate a clip', async () => {
        render(<TimelinePanel />);

        // Find clip
        const clipElement = screen.getByText('clip-1').closest('div');

        // Right click
        fireEvent.contextMenu(clipElement!);

        // Duplicate
        const duplicateOption = screen.getByText('Duplicate Clip');
        fireEvent.click(duplicateOption);

        // Should have 2 clips now
        const clips = useProjectStore.getState().clips;
        expect(Object.keys(clips).length).toBe(2);

        // Verify original clip is still there
        expect(clips['clip-1']).toBeDefined();

        // Find the new clip (not clip-1)
        const newClipId = Object.keys(clips).find(id => id !== 'clip-1');
        expect(newClipId).toBeDefined();
        const newClip = clips[newClipId!];

        // Expect new clip to start after clip-1 (10+5=15)
        expect(newClip.start).toBe(15);
        expect(newClip.trackId).toBe('track-1');
    });
});
