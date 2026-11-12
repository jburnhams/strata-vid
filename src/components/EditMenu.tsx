/**
 * The Edit menu: the same Undo and Redo commands the keys run, from the document history
 * (`useDocumentHistory`), drawn by strata-react's `Menu` with their shortcuts and the step's name, so
 * menu and keys cannot disagree.
 */
import React from 'react';
import { Button, Menu, type Command } from 'strata-react';

export const EditMenu: React.FC<{ commands: readonly Command[] }> = ({ commands }) => (
  <Menu label="Edit" items={[...commands]} trigger={<Button variant="ghost">Edit</Button>} />
);
