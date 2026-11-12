import { renderWithStrata } from 'strata-react/testing';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';

// Mock dependencies
jest.mock('../../src/components/LibraryPanel', () => ({
  LibraryPanel: () => <div data-testid="library-panel">Library</div>
}));
jest.mock('../../src/components/PreviewPanel', () => ({
  PreviewPanel: () => <div data-testid="preview-panel">Preview</div>
}));
jest.mock('../../src/components/TimelinePanel', () => ({
  TimelinePanel: () => <div data-testid="timeline-panel">Timeline</div>
}));
jest.mock('../../src/components/MetadataPanel', () => ({
  MetadataPanel: () => <div data-testid="metadata-panel">Metadata</div>
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

describe('Integration: Help System', () => {
  beforeEach(() => {
    useProjectStore.setState({
      assets: {},
      tracks: {},
      clips: {},
      toasts: [],
      isLoading: false
    });
  });

  it('opens help modal via button', () => {
    renderWithStrata(<App />);

    // Help button should be in header
    const helpBtn = screen.getByRole('button', { name: 'Keyboard shortcuts' });
    fireEvent.click(helpBtn);

    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
  });

  it('opens help modal via keyboard shortcut (?)', () => {
    renderWithStrata(<App />);

    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
  });

  it('closes help modal', () => {
    renderWithStrata(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();

    const closeBtns = screen.getAllByRole('button', { name: 'Close' });
    const closeBtn = closeBtns[closeBtns.length - 1];
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog', { name: 'Keyboard shortcuts' })).not.toBeInTheDocument();
  });
});
