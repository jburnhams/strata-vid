import React from 'react';
import { render, screen } from '@testing-library/react';
import ElevationProfile from '../../../../src/components/preview/ElevationProfile';
import * as gpxParser from '../../../../src/utils/gpxParser';

// Mock the gpxParser utility
jest.mock('../../../../src/utils/gpxParser', () => ({
  getCoordinateAtTime: jest.fn(),
}));

const mockGpxPoints = [
  { time: 1000, lat: 0, lon: 0, ele: 10, dist: 0 },
  { time: 2000, lat: 0, lon: 0, ele: 20, dist: 100 },
  { time: 3000, lat: 0, lon: 0, ele: 15, dist: 200 },
];

describe('ElevationProfile', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (gpxParser.getCoordinateAtTime as jest.Mock).mockClear();
  });

  it('renders loading state when stats are not available', () => {
    render(<ElevationProfile gpxPoints={[]} currentTime={0} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the elevation profile SVG with correct elements', () => {
    (gpxParser.getCoordinateAtTime as jest.Mock).mockReturnValue(mockGpxPoints[0]);
    render(<ElevationProfile gpxPoints={mockGpxPoints} currentTime={0} />);

    const svg = screen.getByTestId('elevation-profile').querySelector('svg');
    expect(svg).toBeInTheDocument();

    // Check for path
    const path = svg?.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path?.getAttribute('d')).toMatch(/^M/);

    // Check for axis labels
    expect(screen.getByText('20m')).toBeInTheDocument(); // maxEle
    expect(screen.getByText('10m')).toBeInTheDocument(); // minEle
    expect(screen.getByText('0km')).toBeInTheDocument();
    expect(screen.getByText('0.2km')).toBeInTheDocument(); // totalDist
  });

  it('displays the current position indicator', () => {
    const middlePoint = { ...mockGpxPoints[1], ele: 18 };
    (gpxParser.getCoordinateAtTime as jest.Mock).mockReturnValue(middlePoint);

    render(<ElevationProfile gpxPoints={mockGpxPoints} currentTime={1.5} />);

    const svg = screen.getByTestId('elevation-profile').querySelector('svg');
    const indicatorLine = svg?.querySelector('line[stroke="yellow"]');
    const indicatorCircle = svg?.querySelector('circle[fill="yellow"]');

    expect(indicatorLine).toBeInTheDocument();
    expect(indicatorCircle).toBeInTheDocument();
  });

  it('does not display indicator when current time is outside range', () => {
    (gpxParser.getCoordinateAtTime as jest.Mock).mockReturnValue(null);
    render(<ElevationProfile gpxPoints={mockGpxPoints} currentTime={10} />);

    const svg = screen.getByTestId('elevation-profile').querySelector('svg');
    const indicatorLine = svg?.querySelector('line[stroke="yellow"]');

    expect(indicatorLine).not.toBeInTheDocument();
  });
});
