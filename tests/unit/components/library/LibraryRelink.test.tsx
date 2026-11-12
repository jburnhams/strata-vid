import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { LibraryPanel } from '../../../../src/components/LibraryPanel';
import type { Asset } from '../../../../src/types';
import { chooseFiles } from '../../../utils/files';

describe('LibraryPanel - Relink and Remove', () => {
  const mockOnAssetAdd = jest.fn();
  const mockOnAssetSelect = jest.fn();
  const mockOnAssetRemove = jest.fn();
  const mockOnAssetUpdate = jest.fn();

  const normalAsset: Asset = {
    id: '1',
    name: 'video.mp4',
    type: 'video',
    src: 'blob:url1',
    file: new File([''], 'video.mp4', { type: 'video/mp4' }),
    duration: 10,
    thumbnail: 'blob:thumb1',
  };

  const missingAsset: Asset = {
    id: '2',
    name: 'missing.mp4',
    type: 'video',
    src: '',
    file: undefined, // Missing file
    duration: 20,
    thumbnail: 'blob:thumb2', // Thumbnail might be there from serialized state, or not
  };

  const assets = [normalAsset, missingAsset];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders assets correctly', () => {
    render(
      <LibraryPanel
        assets={assets}
        selectedAssetId={null}
        onAddFile={mockOnAssetAdd}
        onAssetSelect={mockOnAssetSelect}
        onAssetRemove={mockOnAssetRemove}
        onAssetUpdate={mockOnAssetUpdate}
      />
    );

    expect(screen.getByText('video.mp4')).toBeInTheDocument();
    expect(screen.getByText('missing.mp4')).toBeInTheDocument();
  });

  test('calls onAssetRemove when delete button is clicked', () => {
    render(
      <LibraryPanel
        assets={assets}
        selectedAssetId={null}
        onAddFile={mockOnAssetAdd}
        onAssetSelect={mockOnAssetSelect}
        onAssetRemove={mockOnAssetRemove}
        onAssetUpdate={mockOnAssetUpdate}
      />
    );

    const removeButton = screen.getByTestId('remove-asset-1');
    fireEvent.click(removeButton);

    expect(mockOnAssetRemove).toHaveBeenCalledWith('1');
  });

  test('shows relink icon for missing asset and handles file upload', async () => {
    render(
      <LibraryPanel
        assets={assets}
        selectedAssetId={null}
        onAddFile={mockOnAssetAdd}
        onAssetSelect={mockOnAssetSelect}
        onAssetRemove={mockOnAssetRemove}
        onAssetUpdate={mockOnAssetUpdate}
      />
    );

    // The missing file says so in words and offers a relink; the normal one does not
    expect(screen.getByText('File missing')).toBeInTheDocument();
    const relink = screen.getByRole('button', { name: 'Relink missing.mp4' });
    expect(screen.queryByRole('button', { name: 'Relink video.mp4' })).not.toBeInTheDocument();

    const file = new File(['content'], 'restored.mp4', { type: 'video/mp4' });
    chooseFiles(relink, [file]);

    expect(mockOnAssetUpdate).toHaveBeenCalledWith('2', file);
  });
});
