/**
 * The Edit menu: the same undo and redo commands the keys run (useKeyboardShortcuts), drawn by
 * strata-react's `Menu` with their shortcuts, so menu and keys cannot disagree.
 */
import React from 'react';
import { Button, Menu } from 'strata-react';
import { historyCommands } from '../hooks/useKeyboardShortcuts';

export const EditMenu: React.FC = () => (
  <Menu label="Edit" items={historyCommands} trigger={<Button variant="ghost">Edit</Button>} />
);
