import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Command } from 'strata-react';
import { HelpModal } from '../../../src/components/HelpModal';

const commands: Command[] = [
  { id: 'play', label: 'Play', keys: [' '], run: jest.fn() },
  { id: 'undo', label: 'Undo', keys: ['Mod+Z'], run: jest.fn() },
  { id: 'no-keys', label: 'Only in menus', run: jest.fn() },
];

describe('HelpModal', () => {
  it('lists every command that has keys, with its shortcut', () => {
    render(<HelpModal commands={commands} onClose={jest.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(within(dialog).getByText('Play')).toBeInTheDocument();
    expect(within(dialog).getByText('Undo')).toBeInTheDocument();
    expect(within(dialog).getByText('Ctrl+Z')).toBeInTheDocument();
    expect(within(dialog).queryByText('Only in menus')).not.toBeInTheDocument();
  });

  it('calls onClose from its Close button', async () => {
    const onClose = jest.fn();
    render(<HelpModal commands={commands} onClose={onClose} />);
    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    await userEvent.click(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape', async () => {
    const onClose = jest.fn();
    render(<HelpModal commands={commands} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
