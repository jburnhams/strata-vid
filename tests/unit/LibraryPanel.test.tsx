import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryPanel } from '../../src/components/LibraryPanel';
import { Asset } from '../../src/types';

describe('LibraryPanel', () => {
  const mockAssets: Asset[] = [
    { id: '1', name: 'run1.mp4', type: 'video', src: 'blob:1' },
    { id: '2', name: 'track.gpx', type: 'gpx', src: 'blob:2' }
  ];

  const mockOnAdd = jest.fn();
  const mockOnSelect = jest.fn();

  it('renders empty state correctly', () => {
    render(
      <LibraryPanel
        assets={[]}
        selectedAssetId={null}
        onAssetAdd={mockOnAdd}
        onAssetSelect={mockOnSelect}
      />
    );
    expect(screen.getByText(/No assets loaded/i)).toBeInTheDocument();
  });

  it('renders list of assets', () => {
    render(
      <LibraryPanel
        assets={mockAssets}
        selectedAssetId={null}
        onAssetAdd={mockOnAdd}
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
        onAssetAdd={mockOnAdd}
        onAssetSelect={mockOnSelect}
      />
    );

    fireEvent.click(screen.getByText('run1.mp4'));
    expect(mockOnSelect).toHaveBeenCalledWith('1');
  });

  it('calls onAssetAdd when selecting files', () => {
    render(
      <LibraryPanel
        assets={[]}
        selectedAssetId={null}
        onAssetAdd={mockOnAdd}
        onAssetSelect={mockOnSelect}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

    // We need to mock the files property
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);
    expect(mockOnAdd).toHaveBeenCalled();
    expect(mockOnAdd.mock.calls[0][0][0]).toBe(file);
  });
});
