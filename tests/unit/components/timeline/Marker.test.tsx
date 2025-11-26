
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { Marker } from '../../../../src/components/timeline/Marker';
import { Marker as MarkerType } from '../../../../src/types';

describe('Marker', () => {
  const mockMarker: MarkerType = {
    id: 'marker1',
    time: 10,
    label: 'Test Marker',
    color: '#ff0000',
  };

  it('should render the marker with the correct style', () => {
    const { getByTestId } = render(<Marker marker={mockMarker} zoomLevel={10} />);
    const markerElement = getByTestId('marker-marker1');
    expect(markerElement).toBeInTheDocument();
    expect(markerElement.style.left).toBe('100px');
  });

  it('should call the onClick handler when the marker head is clicked', () => {
    const onClick = jest.fn();
    const { getByTitle } = render(<Marker marker={mockMarker} zoomLevel={10} onClick={onClick} />);
    const markerHead = getByTitle('Test Marker (10.00s)');
    fireEvent.click(markerHead);
    expect(onClick).toHaveBeenCalledWith('marker1');
  });

  it('should not call the onClick handler if it is not provided', () => {
    const { getByTitle } = render(<Marker marker={mockMarker} zoomLevel={10} />);
    const markerHead = getByTitle('Test Marker (10.00s)');
    expect(() => fireEvent.click(markerHead)).not.toThrow();
  });
});
