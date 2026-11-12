import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditMenu } from '../../../src/components/EditMenu';
import { useProjectStore } from '../../../src/store/useProjectStore';
import '@testing-library/jest-dom';

jest.mock('../../../src/store/useProjectStore', () => {
  const mockStore = jest.fn();
  (mockStore as any).undo = jest.fn();
  (mockStore as any).redo = jest.fn();
  return { useProjectStore: mockStore };
});

describe('EditMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a menu button', () => {
    render(<EditMenu />);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('lists undo and redo with their shortcuts', async () => {
    render(<EditMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('menuitem', { name: /Undo/ })).toHaveTextContent('Ctrl+Z');
    expect(screen.getByRole('menuitem', { name: /Redo/ })).toHaveTextContent('Ctrl+Y');
  });

  it('calls undo when chosen', async () => {
    render(<EditMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Undo/ }));
    expect((useProjectStore as any).undo).toHaveBeenCalled();
  });

  it('calls redo when chosen', async () => {
    render(<EditMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Redo/ }));
    expect((useProjectStore as any).redo).toHaveBeenCalled();
  });
});
