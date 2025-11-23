import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClipItem } from '../../../../src/components/timeline/ClipItem';
import { Clip } from '../../../../src/types';

// Mock dnd-kit
jest.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  }),
}));

const mockClip: Clip = {
  id: 'clip-1',
  assetId: 'asset-1',
  trackId: 'track-1',
  start: 10,
  duration: 5,
  offset: 0,
  properties: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
  },
  type: 'video',
};

describe('ClipItem', () => {
  const defaultProps = {
    clip: mockClip,
    zoomLevel: 10,
    onSelect: jest.fn(),
    onResize: jest.fn(),
  };

  it('renders correctly positioned', () => {
    render(<ClipItem {...defaultProps} />);
    const clipElement = screen.getByText('clip-1').closest('div');
    expect(clipElement).toHaveStyle({
      left: '100px', // 10 * 10
      width: '50px', // 5 * 10
    });
  });

  it('calls onSelect when clicked', () => {
    render(<ClipItem {...defaultProps} />);
    const clipElement = screen.getByText('clip-1').closest('div');
    if (clipElement) {
        fireEvent.click(clipElement);
        expect(defaultProps.onSelect).toHaveBeenCalledWith('clip-1');
    } else {
        throw new Error('Clip element not found');
    }
  });

  it('applies correct color class for video', () => {
    render(<ClipItem {...defaultProps} clip={{ ...mockClip, type: 'video' }} />);
    const clipElement = screen.getByText('clip-1').closest('div');
    expect(clipElement?.className).toContain('bg-blue-600/80');
  });

  it('applies correct color class for audio', () => {
    render(<ClipItem {...defaultProps} clip={{ ...mockClip, type: 'audio' }} />);
    const clipElement = screen.getByText('clip-1').closest('div');
    expect(clipElement?.className).toContain('bg-emerald-600/80');
  });

  it('applies correct color class for map', () => {
    render(<ClipItem {...defaultProps} clip={{ ...mockClip, type: 'map' }} />);
    const clipElement = screen.getByText('clip-1').closest('div');
    expect(clipElement?.className).toContain('bg-orange-600/80');
  });
});
