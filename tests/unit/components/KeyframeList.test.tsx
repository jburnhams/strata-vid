
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { KeyframeList } from '../../../src/components/KeyframeList';
import { useProjectStore } from '../../../src/store/useProjectStore';

// Polyfill crypto.randomUUID
if (!global.crypto.randomUUID) {
    Object.defineProperty(global.crypto, 'randomUUID', {
        value: () => 'test-uuid-' + Math.random().toString(36).substring(2)
    });
}

describe('KeyframeList', () => {
    const clipId = 'test-clip';

    beforeEach(() => {
        useProjectStore.setState({
            clips: {
                [clipId]: {
                    id: clipId,
                    assetId: 'asset-1',
                    trackId: 'track-1',
                    start: 0,
                    duration: 10,
                    offset: 0,
                    type: 'video',
                    properties: {
                        opacity: 1,
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 100
                    },
                    keyframes: {}
                }
            },
            currentTime: 0
        });
    });

    it('renders correctly', () => {
        render(<KeyframeList clipId={clipId} property="opacity" label="Opacity" />);
        expect(screen.getByText('Opacity')).toBeInTheDocument();
        expect(screen.getByText('No keyframes')).toBeInTheDocument();
    });

    it('returns null if clip not found', () => {
        const { container } = render(<KeyframeList clipId="non-existent" property="opacity" label="Opacity" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('adds a keyframe', () => {
        useProjectStore.setState({ currentTime: 5 });
        render(<KeyframeList clipId={clipId} property="opacity" label="Opacity" />);

        const addButton = screen.getByTitle('Add Keyframe at Playhead');
        fireEvent.click(addButton);

        const state = useProjectStore.getState();
        const keyframes = state.clips[clipId].keyframes!.opacity;
        expect(keyframes).toHaveLength(1);
        expect(keyframes[0].time).toBe(5);
        expect(keyframes[0].value).toBe(1); // Default opacity

        expect(screen.queryByText('No keyframes')).not.toBeInTheDocument();
        // Check for time display (formatted 0:05.00)
        expect(screen.getByText('0:05.00')).toBeInTheDocument();
    });

    it('updates keyframe value', () => {
        useProjectStore.setState((state) => {
            state.clips[clipId].keyframes = {
                opacity: [{ id: 'kf1', time: 5, value: 0.5, easing: 'linear' }]
            };
        });

        render(<KeyframeList clipId={clipId} property="opacity" label="Opacity" />);

        const input = screen.getByDisplayValue('0.5');
        fireEvent.change(input, { target: { value: '0.8' } });

        const state = useProjectStore.getState();
        expect(state.clips[clipId].keyframes!.opacity[0].value).toBe(0.8);
    });

    it('updates keyframe easing', () => {
        useProjectStore.setState((state) => {
            state.clips[clipId].keyframes = {
                opacity: [{ id: 'kf1', time: 5, value: 0.5, easing: 'linear' }]
            };
        });

        render(<KeyframeList clipId={clipId} property="opacity" label="Opacity" />);

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'ease-in' } });

        const state = useProjectStore.getState();
        expect(state.clips[clipId].keyframes!.opacity[0].easing).toBe('ease-in');
    });

    it('removes a keyframe', () => {
        useProjectStore.setState((state) => {
            state.clips[clipId].keyframes = {
                opacity: [{ id: 'kf1', time: 5, value: 0.5, easing: 'linear' }]
            };
        });

        render(<KeyframeList clipId={clipId} property="opacity" label="Opacity" />);

        // Find the remove button (it has Trash2 icon). Since it's inside the list, we can find it.
        // The button has an opacity class but is clickable.
        const buttons = screen.getAllByRole('button');
        // First button is Add, second is Remove (per render order)
        const removeButton = buttons[1];

        fireEvent.click(removeButton);

        const state = useProjectStore.getState();
        expect(state.clips[clipId].keyframes!.opacity).toHaveLength(0);
        expect(screen.getByText('No keyframes')).toBeInTheDocument();
    });

    it('interpolates value when adding keyframe', () => {
         // Setup: Keyframe at 0 (value 0) and 10 (value 1)
         // Current time: 5. Expected value: 0.5
         useProjectStore.setState((state) => {
             state.clips[clipId].keyframes = {
                 opacity: [
                     { id: 'kf1', time: 0, value: 0, easing: 'linear' },
                     { id: 'kf2', time: 10, value: 1, easing: 'linear' }
                 ]
             };
             state.currentTime = 5;
         });

         render(<KeyframeList clipId={clipId} property="opacity" label="Opacity" />);

         const addButton = screen.getByTitle('Add Keyframe at Playhead');
         fireEvent.click(addButton);

         const state = useProjectStore.getState();
         const keyframes = state.clips[clipId].keyframes!.opacity;
         expect(keyframes).toHaveLength(3);
         const middleKf = keyframes.find(k => k.time === 5);
         expect(middleKf).toBeDefined();
         expect(middleKf!.value).toBeCloseTo(0.5);
    });
});
