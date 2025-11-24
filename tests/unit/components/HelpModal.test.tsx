import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpModal } from '../../../src/components/HelpModal';

describe('HelpModal', () => {
  it('renders correctly', () => {
    const onClose = jest.fn();
    render(<HelpModal onClose={onClose} />);

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Play / Pause')).toBeInTheDocument();
    expect(screen.getByText('Show Help')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<HelpModal onClose={onClose} />);

    // There are two close buttons (header X and bottom button)
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(closeButtons[1]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('calls onClose when clicking the backdrop', () => {
    const onClose = jest.fn();
    const { container } = render(<HelpModal onClose={onClose} />);

    // The backdrop is the outermost div
    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when clicking the modal content', () => {
    const onClose = jest.fn();
    render(<HelpModal onClose={onClose} />);

    fireEvent.click(screen.getByText('Keyboard Shortcuts'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
