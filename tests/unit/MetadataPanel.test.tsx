import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetadataPanel } from '../../src/components/MetadataPanel';
import { Asset } from '../../src/types';

describe('MetadataPanel', () => {
  it('renders empty state', () => {
    render(<MetadataPanel activeAsset={null} />);
    expect(screen.getByText('No selection')).toBeInTheDocument();
  });

  it('renders asset details', () => {
    const asset: Asset = { id: '1', name: 'test.mp4', type: 'video', src: 'blob:x' };
    render(<MetadataPanel activeAsset={asset} />);
    expect(screen.getByText('test.mp4')).toBeInTheDocument();
    expect(screen.getByText('video')).toBeInTheDocument();
  });
});
