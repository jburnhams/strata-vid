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
    render(<App />);

    // Help button should be in header
    const helpBtn = screen.getByLabelText('Help');
    fireEvent.click(helpBtn);

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('opens help modal via keyboard shortcut (?)', () => {
    render(<App />);

    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('closes help modal', () => {
    render(<App />);

    fireEvent.click(screen.getByLabelText('Help'));
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close Help');
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
  });
});
