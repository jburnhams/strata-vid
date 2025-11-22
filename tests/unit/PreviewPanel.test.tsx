import React from 'react';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '../../src/components/PreviewPanel';
import { Asset } from '../../src/types';

describe('PreviewPanel', () => {
  it('renders empty state', () => {
    render(<PreviewPanel activeAsset={null} />);
    expect(screen.getByText('Select a video to preview')).toBeInTheDocument();
  });

  it('renders video player for video asset', () => {
    const asset: Asset = { id: '1', name: 'test.mp4', type: 'video', src: 'blob:x' };
    render(<PreviewPanel activeAsset={asset} />);
    // Check for video element
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'blob:x');
  });

  it('renders not available for gpx', () => {
    const asset: Asset = { id: '2', name: 'test.gpx', type: 'gpx', src: 'blob:y' };
    render(<PreviewPanel activeAsset={asset} />);
    expect(screen.getByText('Preview not available for gpx')).toBeInTheDocument();
  });
});
