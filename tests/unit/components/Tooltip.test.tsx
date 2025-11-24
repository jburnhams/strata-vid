import React from 'react';
import { render, screen } from '@testing-library/react';
import { Tooltip } from '../../../src/components/Tooltip';
import userEvent from '@testing-library/user-event';

describe('Tooltip', () => {
  it('renders children', () => {
    render(
      <Tooltip content="Test Tip">
        <button>Hover me</button>
      </Tooltip>
    );
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('shows tooltip on hover', async () => {
    render(
      <Tooltip content="Test Tip">
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');

    // Tooltip should not be visible initially
    expect(screen.queryByText('Test Tip')).not.toBeInTheDocument();

    // Hover
    await userEvent.hover(button);
    expect(screen.getByText('Test Tip')).toBeInTheDocument();

    // Unhover
    await userEvent.unhover(button);
    expect(screen.queryByText('Test Tip')).not.toBeInTheDocument();
  });
});
