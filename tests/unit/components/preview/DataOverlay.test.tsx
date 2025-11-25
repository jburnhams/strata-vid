import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataOverlay from '../../../../src/components/preview/DataOverlay';
import { DataOverlayOptions, TextStyle } from '../../../../src/types';

describe('DataOverlay', () => {
  const mockData = {
    speed: 10, // m/s
    dist: 5000, // m
    ele: 123.45,
  };

  it('renders all data points with default units', () => {
    render(<DataOverlay gpxData={mockData} />);
    expect(screen.getByText('Speed: 36.0 km/h')).toBeInTheDocument();
    expect(screen.getByText('Distance: 5.00 km')).toBeInTheDocument();
    expect(screen.getByText('Elevation: 123.5 m')).toBeInTheDocument();
  });

  it('hides data points based on options', () => {
    const options: DataOverlayOptions = {
      showSpeed: false,
      showDistance: true,
      showElevation: false,
      speedUnit: 'kmh',
      distanceUnit: 'km',
      elevationUnit: 'm',
    };
    render(<DataOverlay gpxData={mockData} options={options} />);
    expect(screen.queryByText(/Speed/)).not.toBeInTheDocument();
    expect(screen.getByText('Distance: 5.00 km')).toBeInTheDocument();
    expect(screen.queryByText(/Elevation/)).not.toBeInTheDocument();
  });

  it('converts units correctly based on options', () => {
    const options: DataOverlayOptions = {
      showSpeed: true,
      showDistance: true,
      showElevation: true,
      speedUnit: 'mph',
      distanceUnit: 'mi',
      elevationUnit: 'ft',
    };
    render(<DataOverlay gpxData={mockData} options={options} />);
    expect(screen.getByText('Speed: 22.4 mph')).toBeInTheDocument();
    expect(screen.getByText('Distance: 3.11 mi')).toBeInTheDocument();
    expect(screen.getByText('Elevation: 405 ft')).toBeInTheDocument();
  });

  it('applies custom text styles', () => {
    const textStyle: TextStyle = {
      fontFamily: 'Arial',
      fontSize: 20,
      fontWeight: 'bold',
      color: 'rgb(255, 0, 0)',
      backgroundColor: 'rgb(0, 0, 255)',
      textAlign: 'center',
    };
    render(<DataOverlay gpxData={mockData} textStyle={textStyle} />);
    const overlay = screen.getByTestId('data-overlay');
    expect(overlay).toHaveStyle('font-family: Arial');
    expect(overlay).toHaveStyle('font-size: 20px');
    expect(overlay).toHaveStyle('font-weight: bold');
    expect(overlay).toHaveStyle('color: rgb(255, 0, 0)');
    expect(overlay).toHaveStyle('background-color: rgb(0, 0, 255)');
    expect(overlay).toHaveStyle('text-align: center');
  });

  it('merges default and custom options/styles', () => {
    const options: Partial<DataOverlayOptions> = {
      speedUnit: 'm/s',
    };
    const textStyle: Partial<TextStyle> = {
      color: 'rgb(0, 255, 0)',
    };
    render(<DataOverlay gpxData={mockData} options={options} textStyle={textStyle} />);
    // Check custom values
    expect(screen.getByText('Speed: 10.0 m/s')).toBeInTheDocument();
    const overlay = screen.getByTestId('data-overlay');
    expect(overlay).toHaveStyle('color: rgb(0, 255, 0)');
    // Check default values
    expect(screen.getByText('Distance: 5.00 km')).toBeInTheDocument();
    expect(overlay).toHaveStyle('background-color: rgba(0, 0, 0, 0.5)');
  });
});
