import React from 'react';
import { render, screen } from '@testing-library/react';
import ElevationProfile from '../../../../src/components/preview/ElevationProfile';
import { GpxPoint } from '../../../../src/types';

const mockGpxPoints: GpxPoint[] = [
  { time: 1000, lat: 0, lon: 0, ele: 10, dist: 0 },
  { time: 2000, lat: 0, lon: 0, ele: 20, dist: 100 },
  { time: 3000, lat: 0, lon: 0, ele: 15, dist: 200 },
];

describe('ElevationProfile', () => {
  it('renders the elevation profile SVG', () => {
    render(<ElevationProfile gpxPoints={mockGpxPoints} currentTime={1.5} />);

    const profile = screen.getByTestId('elevation-profile');
    expect(profile).toBeInTheDocument();

    const svg = profile.querySelector('svg');
    expect(svg).toBeInTheDocument();

    const path = svg?.querySelector('path');
    expect(path).toHaveAttribute('d', 'M 50,180 L 415,10 L 780,95');
  });

  it('renders a loading state when no gpxPoints are provided', () => {
    render(<ElevationProfile gpxPoints={[]} currentTime={0} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays the current position indicator', () => {
    render(<ElevationProfile gpxPoints={mockGpxPoints} currentTime={1.5} />);

    const svg = screen.getByTestId('elevation-profile').querySelector('svg');
    const indicatorLine = svg?.querySelector('line[stroke="yellow"]');
    expect(indicatorLine).toBeInTheDocument();

    const indicatorCircle = svg?.querySelector('circle');
    expect(indicatorCircle).toBeInTheDocument();
  });

  it('does not display indicator when current time is outside range', () => {
    render(<ElevationProfile gpxPoints={mockGpxPoints} currentTime={10} />);

    const svg = screen.getByTestId('elevation-profile').querySelector('svg');
    const indicatorLine = svg?.querySelector('line[stroke="yellow"]');

    expect(indicatorLine).not.toBeInTheDocument();
  });
});
