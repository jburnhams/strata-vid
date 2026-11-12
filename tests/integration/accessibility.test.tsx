import { renderWithStrata } from 'strata-react/testing';
import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

// Mock dependencies
jest.mock('../../src/components/LibraryPanel', () => ({
  LibraryPanel: () => <div>Library</div>
}));
jest.mock('../../src/components/PreviewPanel', () => ({
  PreviewPanel: () => <div>Preview</div>
}));
jest.mock('../../src/components/TimelinePanel', () => ({
  TimelinePanel: () => <div>Timeline</div>
}));
jest.mock('../../src/components/MetadataPanel', () => ({
  MetadataPanel: () => <div>Metadata</div>
}));

describe('Integration: Accessibility', () => {
  it('each pane of the workspace is a named region', () => {
    renderWithStrata(<App />);

    expect(screen.getByRole('group', { name: 'Editor' })).toBeInTheDocument();
    for (const name of ['Library', 'Preview', 'Inspector', 'Timeline']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
  });

  it('a pane folds from the View menu and its own header', async () => {
    const user = userEvent.setup();
    renderWithStrata(<App />);

    await user.click(screen.getByRole('button', { name: 'Hide Library' }));
    const fold = () => document.querySelector('[aria-controls="pane-body-library"]');
    expect(fold()).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: 'View' }));
    await user.click(await screen.findByRole('menuitem', { name: /Show library/ }));
    expect(fold()).toHaveAttribute('aria-expanded', 'true');
  });

  it('header buttons have accessible labels', () => {
    renderWithStrata(<App />);

    expect(screen.getByRole('button', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Appearance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export video' })).toBeInTheDocument();
  });
});
