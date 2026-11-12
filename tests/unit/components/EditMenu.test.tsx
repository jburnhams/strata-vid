import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Command } from 'strata-react';
import { EditMenu } from '../../../src/components/EditMenu';
import '@testing-library/jest-dom';

const commands = (): [Command, Command] => [
  { id: 'undo', label: 'Undo trim clip', keys: ['Mod+Z'], run: jest.fn() },
  { id: 'redo', label: 'Redo', keys: ['Mod+Y'], run: jest.fn(), disabled: 'Nothing to redo' },
];

describe('EditMenu', () => {
  it('lists the history commands with their names and shortcuts', async () => {
    render(<EditMenu commands={commands()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('menuitem', { name: /Undo trim clip/ })).toHaveTextContent('Ctrl+Z');
    expect(screen.getByRole('menuitem', { name: /Redo/ })).toHaveAttribute('aria-disabled', 'true');
  });

  it('runs undo when chosen', async () => {
    const items = commands();
    render(<EditMenu commands={items} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Undo/ }));
    expect(items[0].run).toHaveBeenCalled();
  });
});
