import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'strata-react';
import { ToastContainer } from '../../../src/components/Toast';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { showInfo, showWarning, showSuccess, handleError } from '../../../src/utils/errorHandler';

describe('ToastContainer', () => {
    beforeEach(() => {
        useProjectStore.setState({ toasts: [] });
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        act(() => toast.clear());
    });

    it('renders nothing when there are no notices', () => {
        const { container } = render(<ToastContainer />);
        expect(container.firstChild).toBeNull();
    });

    it('sends success, info and warning to strata toasts and keeps errors as alerts', () => {
        const show = jest.spyOn(toast, 'show');
        act(() => {
            useProjectStore.setState({
                toasts: [
                    { id: '1', message: 'Loaded 2 files', type: 'success' },
                    { id: '2', message: 'run.gpx could not be read', type: 'error' },
                ],
            });
        });

        render(<ToastContainer />);
        expect(show).toHaveBeenCalledWith({ title: 'Loaded 2 files', tone: 'success' });
        expect(screen.getByRole('alert')).toHaveTextContent('run.gpx could not be read');
        expect(useProjectStore.getState().toasts.map(t => t.id)).toEqual(['2']);
    });

    it('dismisses an error', async () => {
        act(() => {
            useProjectStore.setState({ toasts: [{ id: '1', message: 'Export failed', type: 'error' }] });
        });

        render(<ToastContainer />);
        await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
        expect(useProjectStore.getState().toasts).toHaveLength(0);
    });

    it('queues every kind through the helpers', () => {
        act(() => {
            showInfo('Info Message');
            showWarning('Warning Message');
            showSuccess('Success Message');
            handleError(new Error('Error Message'));
        });

        expect(useProjectStore.getState().toasts).toHaveLength(4);
        expect(useProjectStore.getState().toasts.find(t => t.message === 'Info Message')?.type).toBe('info');
        expect(useProjectStore.getState().toasts.find(t => t.message === 'Warning Message')?.type).toBe('warning');
        expect(useProjectStore.getState().toasts.find(t => t.message === 'Success Message')?.type).toBe('success');
        expect(useProjectStore.getState().toasts.find(t => t.message === 'Error Message')?.type).toBe('error');
    });
});
