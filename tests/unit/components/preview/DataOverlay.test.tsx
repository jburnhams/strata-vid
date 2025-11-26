
import React from 'react';
import { render, screen } from '@testing-library/react';
import DataOverlay from '../../../../src/components/preview/DataOverlay';
import '@testing-library/jest-dom';

describe('DataOverlay', () => {
  const mockGpxData = {
    speed: 10, // 10 m/s
    dist: 5000, // 5000 meters
    ele: 100, // 100 meters
  };

  it('renders all data fields with default units', () => {
    render(<DataOverlay gpxData={mockGpxData} />);

    // Default units are km/h, km, m
    expect(screen.getByText('Speed: 36.0 km/h')).toBeInTheDocument();
    expect(screen.getByText('Distance: 5.00 km')).toBeInTheDocument();
    expect(screen.getByText('Elevation: 100.0 m')).toBeInTheDocument();
  });

  it('respects the show/hide options', () => {
    render(<DataOverlay gpxData={mockGpxData} options={{ showSpeed: false }} />);

    expect(screen.queryByText(/Speed/)).not.toBeInTheDocument();
    expect(screen.getByText(/Distance/)).toBeInTheDocument();
    expect(screen.getByText(/Elevation/)).toBeInTheDocument();
  });

  it('formats units correctly (imperial)', () => {
    render(<DataOverlay gpxData={mockGpxData} options={{ speedUnit: 'mph', distanceUnit: 'mi', elevationUnit: 'ft' }} />);

    expect(screen.getByText('Speed: 22.4 mph')).toBeInTheDocument();
    expect(screen.getByText('Distance: 3.11 mi')).toBeInTheDocument();
    expect(screen.getByText('Elevation: 328 ft')).toBeInTheDocument();
  });

  it('applies custom text styling', () => {
    render(<DataOverlay gpxData={mockGpxData} textStyle={{ color: 'rgb(255, 0, 0)', fontSize: 24 }} />);

    const element = screen.getByTestId('data-overlay');
    expect(element).toHaveStyle('color: rgb(255, 0, 0)');
    expect(element).toHaveStyle('font-size: 24px');
  });

  it('does not render fields if data is missing', () => {
    render(<DataOverlay gpxData={{}} />);

    expect(screen.queryByText(/Speed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Distance/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Elevation/)).not.toBeInTheDocument();
  });

});
