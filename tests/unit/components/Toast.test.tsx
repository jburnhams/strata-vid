import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastContainer } from '../../../src/components/Toast';
import { useProjectStore } from '../../../src/store/useProjectStore';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="icon-x" />,
  CheckCircle: () => <div data-testid="icon-check" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
  Info: () => <div data-testid="icon-info" />,
  AlertTriangle: () => <div data-testid="icon-warning" />,
}));

describe('ToastContainer', () => {
    beforeEach(() => {
        // Reset store
        useProjectStore.setState({
            toasts: []
        });
    });

    it('should render nothing when no toasts', () => {
        const { container } = render(<ToastContainer />);
        expect(container.firstChild).toBeNull();
    });

    it('should render toasts', () => {
        act(() => {
            useProjectStore.setState({
                toasts: [
                    { id: '1', message: 'Success Toast', type: 'success' },
                    { id: '2', message: 'Error Toast', type: 'error' }
                ]
            });
        });

        render(<ToastContainer />);
        expect(screen.getByText('Success Toast')).toBeInTheDocument();
        expect(screen.getByText('Error Toast')).toBeInTheDocument();
        expect(screen.getByTestId('icon-check')).toBeInTheDocument();
        expect(screen.getByTestId('icon-alert')).toBeInTheDocument();
    });

    it('should dismiss toast on click', async () => {
        const user = userEvent.setup();
        act(() => {
            useProjectStore.setState({
                toasts: [
                    { id: '1', message: 'Dismiss Me', type: 'info' }
                ]
            });
        });

        render(<ToastContainer />);
        // The close button wraps the icon
        const closeButton = screen.getByTestId('icon-x').closest('button');
        if (!closeButton) throw new Error('Close button not found');

        await user.click(closeButton);

        expect(useProjectStore.getState().toasts).toHaveLength(0);
    });
});
