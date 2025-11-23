import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders correctly', () => {
    render(<EditMenu />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('calls undo when clicked', () => {
    render(<EditMenu />);
    fireEvent.click(screen.getByText('Undo'));
    expect((useProjectStore as any).undo).toHaveBeenCalled();
  });

  it('calls redo when clicked', () => {
    render(<EditMenu />);
    fireEvent.click(screen.getByText('Redo'));
    expect((useProjectStore as any).redo).toHaveBeenCalled();
  });
});
