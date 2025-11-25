import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataOverlay from '../../../../src/components/preview/DataOverlay';

describe('DataOverlay', () => {
  it('renders all data points when provided', () => {
    const mockData = {
      speed: 10, // m/s
      dist: 5000, // m
      ele: 123.45,
    };
    render(<DataOverlay gpxData={mockData} />);

    expect(screen.getByText('Speed: 36.0 km/h')).toBeInTheDocument();
    expect(screen.getByText('Distance: 5.00 km')).toBeInTheDocument();
    expect(screen.getByText('Elevation: 123.5 m')).toBeInTheDocument();
  });

  it('renders only the provided data points', () => {
    const mockData = {
      speed: 5, // m/s
    };
    render(<DataOverlay gpxData={mockData} />);

    expect(screen.getByText('Speed: 18.0 km/h')).toBeInTheDocument();
    expect(screen.queryByText(/Distance/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Elevation/)).not.toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    const mockData = {
      speed: 0,
      dist: 0,
      ele: 0,
    };
    render(<DataOverlay gpxData={mockData} />);

    expect(screen.getByText('Speed: 0.0 km/h')).toBeInTheDocument();
    expect(screen.getByText('Distance: 0.00 km')).toBeInTheDocument();
    expect(screen.getByText('Elevation: 0.0 m')).toBeInTheDocument();
  });

  it('applies className and style props', () => {
    const mockData = { ele: 10 };
    render(<DataOverlay gpxData={mockData} className="custom-class" style={{ color: 'red' }} />);

    const overlay = screen.getByTestId('data-overlay');
    expect(overlay).toHaveClass('custom-class');
    expect(overlay).toHaveStyle('color: red');
  });
});
