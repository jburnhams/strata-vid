import React from 'react';
import { render, screen } from '@testing-library/react';
import ElevationProfile from '../../src/components/preview/ElevationProfile';
import { GpxPoint } from '../../src/types';

const mockGpxPoints: GpxPoint[] = [
  { time: 1000, lat: 0, lon: 0, ele: 10, dist: 0 },
  { time: 2000, lat: 0, lon: 0, ele: 20, dist: 100 },
  { time: 3000, lat: 0, lon: 0, ele: 15, dist: 200 },
];

describe('ElevationProfile', () => {
  it('renders loading state when no gpxPoints are provided', () => {
    render(<ElevationProfile gpxPoints={[]} currentTime={0} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the elevation profile SVG when gpxPoints are provided', () => {
    render(<ElevationProfile gpxPoints={mockGpxPoints} currentTime={0} />);
    expect(screen.getByTestId('elevation-profile')).toBeInTheDocument();
    expect(screen.getByText('20m')).toBeInTheDocument();
    expect(screen.getByText('10m')).toBeInTheDocument();
    expect(screen.getByText('0.2km')).toBeInTheDocument();
  });

  it('renders the current position indicator', () => {
    render(<ElevationProfile gpxPoints={mockGpxPoints} currentTime={1.5} />);
    const indicator = screen.getByTestId('elevation-profile').querySelector('g');
    expect(indicator).toBeInTheDocument();
  });
});
