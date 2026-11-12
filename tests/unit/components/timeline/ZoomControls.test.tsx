
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoomControls } from '../../../../src/components/timeline/ZoomControls';

describe('ZoomControls', () => {
  const setZoomLevel = jest.fn();
  const onZoomToFit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders zoom controls', () => {
    render(
      <ZoomControls
        zoomLevel={50}
        setZoomLevel={setZoomLevel}
        onZoomToFit={onZoomToFit}
      />
    );
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom to fit' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Zoom' })).toHaveValue('50');
  });

  it('handles slider change', () => {
    render(<ZoomControls zoomLevel={50} setZoomLevel={setZoomLevel} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });
    expect(setZoomLevel).toHaveBeenCalledWith(75);
  });

  it('decreases zoom on minus click', () => {
    // Current 50. Decrease by max(1, 50 * 0.1) = 5. Result 45.
    render(<ZoomControls zoomLevel={50} setZoomLevel={setZoomLevel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(setZoomLevel).toHaveBeenCalledWith(45);
  });

  it('decreases zoom clamped to min', () => {
    // Current 1. Decrease by 0.1. Result < 1. Clamp to 1 (default min).
    // Logic: delta = max(1, 1*0.1) = 1. New = 1 - 1 = 0. Min 1.
    render(<ZoomControls zoomLevel={1} setZoomLevel={setZoomLevel} min={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(setZoomLevel).toHaveBeenCalledWith(1);
  });

  it('increases zoom on plus click', () => {
    // Current 50. Increase by 5. Result 55.
    render(<ZoomControls zoomLevel={50} setZoomLevel={setZoomLevel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(setZoomLevel).toHaveBeenCalledWith(55);
  });

  it('increases zoom clamped to max', () => {
    // Current 200. Increase by 20. Result 220. Max 200.
    render(<ZoomControls zoomLevel={200} setZoomLevel={setZoomLevel} max={200} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(setZoomLevel).toHaveBeenCalledWith(200);
  });

  it('calls onZoomToFit when clicked', () => {
    render(
      <ZoomControls
        zoomLevel={50}
        setZoomLevel={setZoomLevel}
        onZoomToFit={onZoomToFit}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Zoom to fit' }));
    expect(onZoomToFit).toHaveBeenCalled();
  });

  it('does not render zoom to fit button if handler not provided', () => {
      render(<ZoomControls zoomLevel={50} setZoomLevel={setZoomLevel} />);
      expect(screen.queryByRole('button', { name: 'Zoom to fit' })).not.toBeInTheDocument();
  });
});
