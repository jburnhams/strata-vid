import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoomControls } from '../../../../src/components/timeline/ZoomControls';

describe('ZoomControls', () => {
  const defaultProps = {
    zoomLevel: 10,
    setZoomLevel: jest.fn(),
    min: 1,
    max: 200,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ZoomControls {...defaultProps} />);
    expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
    expect(screen.getByText('10px')).toBeInTheDocument();
  });

  it('calls setZoomLevel when input changes', () => {
    render(<ZoomControls {...defaultProps} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '20' } });
    expect(defaultProps.setZoomLevel).toHaveBeenCalledWith(20);
  });

  it('increases zoom on plus button click', () => {
    render(<ZoomControls {...defaultProps} />);
    const zoomInBtn = screen.getByTitle('Zoom In');
    fireEvent.click(zoomInBtn);
    // 10 + (10 * 0.1) = 11. Delta = 1.
    expect(defaultProps.setZoomLevel).toHaveBeenCalledWith(11);
  });

  it('decreases zoom on minus button click', () => {
    render(<ZoomControls {...defaultProps} />);
    const zoomOutBtn = screen.getByTitle('Zoom Out');
    fireEvent.click(zoomOutBtn);
    // 10 - (10 * 0.1) = 9. Delta = 1.
    expect(defaultProps.setZoomLevel).toHaveBeenCalledWith(9);
  });

  it('respects min limit', () => {
    render(<ZoomControls {...defaultProps} zoomLevel={1} />);
    const zoomOutBtn = screen.getByTitle('Zoom Out');
    fireEvent.click(zoomOutBtn);
    // Should clamp to min 1
    // 1 - (1 * 0.1) = 0.9. Min is 1.
    expect(defaultProps.setZoomLevel).toHaveBeenCalledWith(1);
  });

  it('respects max limit', () => {
    render(<ZoomControls {...defaultProps} zoomLevel={200} />);
    const zoomInBtn = screen.getByTitle('Zoom In');
    fireEvent.click(zoomInBtn);
    // Should clamp to max 200
    // 200 + (200 * 0.1) = 220. Max is 200.
    expect(defaultProps.setZoomLevel).toHaveBeenCalledWith(200);
  });
});
