import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextMenu } from '../../../../src/components/timeline/ContextMenu';

describe('ContextMenu', () => {
  const defaultProps = {
    x: 100,
    y: 200,
    onClose: jest.fn(),
    options: [
      { label: 'Option 1', onClick: jest.fn() },
      { label: 'Option 2', onClick: jest.fn(), danger: true },
      { label: 'Disabled', onClick: jest.fn(), disabled: true },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders at correct position', () => {
    render(<ContextMenu {...defaultProps} />);
    const menu = screen.getByRole('menu');
    expect(menu).toHaveStyle({ top: '200px', left: '100px' });
  });

  it('renders options', () => {
    render(<ContextMenu {...defaultProps} />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('calls option callback and onClose when clicked', () => {
    render(<ContextMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Option 1'));
    expect(defaultProps.options[0].onClick).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('does not call callback when disabled option is clicked', () => {
    render(<ContextMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Disabled'));
    expect(defaultProps.options[2].onClick).not.toHaveBeenCalled();
  });

  it('closes when clicking outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <ContextMenu {...defaultProps} />
      </div>
    );
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
