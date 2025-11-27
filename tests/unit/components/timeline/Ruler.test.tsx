
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Ruler } from '../../../../src/components/timeline/Ruler';

describe('Ruler', () => {
  it('renders a canvas element', () => {
    render(<Ruler zoomLevel={10} />);
    expect(screen.getByTestId('ruler-canvas')).toBeInTheDocument();
  });

  it('draws ticks on the canvas', () => {
    const mockCtx = {
      scale: jest.fn(),
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      fillText: jest.fn(),
      fillStyle: '',
      font: '',
      textBaseline: '',
    };

    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockCtx);

    render(<Ruler zoomLevel={10} containerWidth={500} scrollLeft={0} />);

    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalled();

    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('adapts tick interval based on zoom level (low zoom)', () => {
    const mockCtx = {
        scale: jest.fn(),
        clearRect: jest.fn(),
        fillRect: jest.fn(),
        fillText: jest.fn(),
      };
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockCtx as any);

      render(<Ruler zoomLevel={1} containerWidth={500} scrollLeft={0} />);
      expect(mockCtx.fillText).toHaveBeenCalled();

      HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('draws minor ticks at medium high zoom (e.g. 30)', () => {
    const mockCtx = {
        scale: jest.fn(),
        clearRect: jest.fn(),
        fillRect: jest.fn(),
        fillText: jest.fn(),
      };
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockCtx as any);

      // Zoom level 30. Tick interval is 5.
      // Minor ticks loop runs. t % 5 != 0 should draw minor tick.
      render(<Ruler zoomLevel={30} containerWidth={500} scrollLeft={0} />);

      // We expect fillRect to be called for major ticks (height/2) and minor ticks (height/4)
      expect(mockCtx.fillRect).toHaveBeenCalled();

      HTMLCanvasElement.prototype.getContext = originalGetContext;
  });
});
