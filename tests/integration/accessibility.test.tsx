import { renderWithStrata } from 'strata-react/testing';
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../../src/App';

// Mock dependencies
jest.mock('../../src/components/LibraryPanel', () => ({
  LibraryPanel: () => <div role="region" aria-label="Library">Library</div>
}));
jest.mock('../../src/components/PreviewPanel', () => ({
  PreviewPanel: () => <div role="region" aria-label="Preview">Preview</div>
}));
jest.mock('../../src/components/TimelinePanel', () => ({
  TimelinePanel: () => <div role="region" aria-label="Timeline">Timeline</div>
}));
jest.mock('../../src/components/MetadataPanel', () => ({
  MetadataPanel: () => <div role="complementary" aria-label="Metadata">Metadata</div>
}));

describe('Integration: Accessibility', () => {
  it('main regions have accessible roles or labels', () => {
    renderWithStrata(<App />);

    expect(screen.getByRole('region', { name: /library/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /timeline/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /metadata/i })).toBeInTheDocument();
  });

  it('header buttons have accessible labels', () => {
    renderWithStrata(<App />);

    expect(screen.getByRole('button', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Appearance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export video' })).toBeInTheDocument();
  });
});
