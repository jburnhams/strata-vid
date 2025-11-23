import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetadataPanel } from '../../src/components/MetadataPanel';
import { Asset } from '../../src/types';

describe('MetadataPanel', () => {
  it('renders empty state', () => {
    render(<MetadataPanel activeAsset={null} />);
    expect(screen.getByText('Select an asset to view details')).toBeInTheDocument();
  });

  it('renders asset details', () => {
    const asset: Asset = { id: '1', name: 'test.mp4', type: 'video', src: 'blob:x' };
    render(<MetadataPanel activeAsset={asset} />);
    expect(screen.getByText('test.mp4')).toBeInTheDocument();
    expect(screen.getByText('video')).toBeInTheDocument();
  });

  it('renders GPX stats', () => {
    const asset: Asset = {
        id: '1', name: 'run.gpx', type: 'gpx', src: 'blob:z',
        stats: {
            distance: { total: 5000 },
            elevation: { gain: 100, loss: 100, max: 200, min: 100, average: 150 },
            time: { start: new Date(), end: new Date(), duration: 1800000 } // 30 mins
        }
    };

    render(<MetadataPanel activeAsset={asset} />);

    expect(screen.getByText('GPX Statistics')).toBeInTheDocument();
    expect(screen.getByText('5.00 km')).toBeInTheDocument();
    expect(screen.getByText('100 m')).toBeInTheDocument();
    expect(screen.getByText('00:30:00')).toBeInTheDocument();
  });
});
