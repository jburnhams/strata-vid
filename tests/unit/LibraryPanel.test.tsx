import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { chooseFiles } from '../utils/files';
import { LibraryPanel } from '../../src/components/LibraryPanel';
import type { Asset } from '../../src/types';

describe('LibraryPanel', () => {
  const mockAssets: Asset[] = [
    { id: '1', name: 'run1.mp4', type: 'video', src: 'blob:1' },
    { id: '2', name: 'track.gpx', type: 'gpx', src: 'blob:2' }
  ];

  const mockOnAdd = jest.fn(async () => {});
  const mockOnSelect = jest.fn();

  it('renders empty state correctly', () => {
    render(
      <LibraryPanel
        assets={[]}
        selectedAssetId={null}
        onAddFile={mockOnAdd}
        onAssetSelect={mockOnSelect}
      />
    );
    expect(screen.getByText('Drag videos, audio or GPX tracks here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose files' })).toBeInTheDocument();
  });

  it('renders list of assets', () => {
    render(
      <LibraryPanel
        assets={mockAssets}
        selectedAssetId={null}
        onAddFile={mockOnAdd}
        onAssetSelect={mockOnSelect}
      />
    );
    expect(screen.getByText('run1.mp4')).toBeInTheDocument();
    expect(screen.getByText('track.gpx')).toBeInTheDocument();
  });

  it('calls onAssetSelect when clicking an item', () => {
    render(
      <LibraryPanel
        assets={mockAssets}
        selectedAssetId={null}
        onAddFile={mockOnAdd}
        onAssetSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('run1.mp4'));
    expect(mockOnSelect).toHaveBeenCalledWith('1');
  });

  it('loads each chosen file and shows its outcome', async () => {
    render(
      <LibraryPanel
        assets={[]}
        selectedAssetId={null}
        onAddFile={mockOnAdd}
        onAssetSelect={mockOnSelect}
      />
    );

    const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });
    chooseFiles(screen.getByRole('button', { name: 'Add files' }), [file]);

    await waitFor(() => expect(mockOnAdd).toHaveBeenCalledWith(file));
    expect(await screen.findByText('Added')).toBeInTheDocument();
  });

  it('names a file it cannot take, and why', async () => {
    render(<LibraryPanel assets={[]} selectedAssetId={null} onAddFile={mockOnAdd} onAssetSelect={mockOnSelect} />);
    mockOnAdd.mockClear();

    chooseFiles(screen.getByRole('button', { name: 'Add files' }), [new File(['x'], 'notes.txt', { type: 'text/plain' })]);

    expect(await screen.findByText('Not added')).toBeInTheDocument();
    expect(screen.getByText(/a video, an audio file or a GPX track/)).toBeInTheDocument();
    expect(mockOnAdd).not.toHaveBeenCalled();
  });

  it('marks a file that failed to load and offers a retry', async () => {
    const failing = jest.fn(async () => { throw new Error('This GPX file has no track points.'); });
    render(<LibraryPanel assets={[]} selectedAssetId={null} onAddFile={failing} onAssetSelect={mockOnSelect} />);

    chooseFiles(screen.getByRole('button', { name: 'Add files' }), [new File(['x'], 'empty.gpx')]);

    expect(await screen.findByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('This GPX file has no track points.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again empty\.gpx/ })).toBeInTheDocument();
  });
});
