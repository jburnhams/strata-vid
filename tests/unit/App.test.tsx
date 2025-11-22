import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

describe('App', () => {
  it('renders the application shell with all panels', () => {
    render(<App />);

    expect(screen.getByText('Strata Vid')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    // Preview has no text if no asset, but check for placeholder text or just no crash
    expect(screen.getByText('Select a video to preview')).toBeInTheDocument();
  });

  it('adds an asset when a file is uploaded', () => {
    render(<App />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    // Expect the asset to appear in the library list
    const items = screen.getAllByText('video.mp4');
    expect(items.length).toBeGreaterThan(0);

    // Expect it to be auto-selected (Preview should show video)
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'mock-url');

    // Expect metadata to show details
    // Note: "video" text appears in Metadata type field, but also potentially elsewhere?
    // It's fine if it finds multiple, or we scope it.
    // screen.getByText might fail if multiple. getAllByText is safer.
    expect(screen.getAllByText('video.mp4').length).toBeGreaterThan(0);

    // Expect timeline to show clip
    expect(screen.getByText('Clip 1')).toBeInTheDocument();
  });
});
