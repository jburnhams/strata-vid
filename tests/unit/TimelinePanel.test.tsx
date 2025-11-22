import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimelinePanel } from '../../src/components/TimelinePanel';
import { Clip } from '../../src/types';

describe('TimelinePanel', () => {
  it('renders timeline header', () => {
    render(<TimelinePanel clips={[]} />);
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('00:00:00')).toBeInTheDocument();
  });

  it('renders empty placeholder', () => {
    render(<TimelinePanel clips={[]} />);
    expect(screen.getByText('Drag video here (Placeholder)')).toBeInTheDocument();
  });

  it('renders clips', () => {
    const clips: Clip[] = [
      { id: '1', assetId: 'a1', start: 0, duration: 10 }
    ];
    render(<TimelinePanel clips={clips} />);
    expect(screen.getByText('Clip 1')).toBeInTheDocument();
  });
});
