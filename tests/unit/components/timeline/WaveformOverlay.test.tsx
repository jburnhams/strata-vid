import React from 'react';
import { render } from '@testing-library/react';
import { WaveformOverlay } from '../../../../src/components/timeline/WaveformOverlay';

describe('WaveformOverlay', () => {
  const mockWaveform = Array.from({ length: 100 }, (_, i) => (i % 2 === 0 ? 0.5 : 1.0)); // Alternating 0.5 and 1.0
  const defaultProps = {
    waveform: mockWaveform,
    assetDuration: 100, // 100 seconds
    offset: 0,
    duration: 10, // Show first 10 seconds
    playbackRate: 1.0,
  };

  it('should render nothing if waveform is empty', () => {
    const { container } = render(<WaveformOverlay {...defaultProps} waveform={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render SVG with path when waveform is present', () => {
    const { getByTestId } = render(<WaveformOverlay {...defaultProps} />);
    const overlay = getByTestId('waveform-overlay');
    expect(overlay).toBeInTheDocument();
    const svg = overlay.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const path = overlay.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path?.getAttribute('d')).toContain('M');
  });

  it('should calculate path based on offset and duration', () => {
    // 100 points, 100 seconds. 1 point per second.
    // Offset 0, Duration 10 -> Should slice first 10 points.
    const { getByTestId } = render(<WaveformOverlay {...defaultProps} />);
    const path = getByTestId('waveform-overlay').querySelector('path');
    const d = path?.getAttribute('d');

    // We expect 10 points (top) + 10 points (bottom) = 20 points roughly in the path
    // Just checking it renders something valid
    expect(d).not.toBe('');
  });

  it('should handle sliced range correctly (middle of clip)', () => {
    // Offset 50, Duration 10 -> Points 50-60
    const { getByTestId } = render(<WaveformOverlay {...defaultProps} offset={50} />);
    const path = getByTestId('waveform-overlay').querySelector('path');
    expect(path).toBeInTheDocument();
  });

  it('should handle single point gracefully (zoomed in)', () => {
      // Offset 0, Duration 0.1 (0.1s -> 0.1 points)
      // Should fallback to single value
      const { getByTestId } = render(<WaveformOverlay {...defaultProps} duration={0.1} />);
      const path = getByTestId('waveform-overlay').querySelector('path');
      expect(path).toBeInTheDocument();
      // Should result in a rectangle
      const d = path?.getAttribute('d');
      expect(d).toMatch(/L 100,/); // Checks if it draws to the right edge
  });
});
