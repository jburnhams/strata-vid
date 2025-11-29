import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClipItem } from '../../../../src/components/timeline/ClipItem';
import { Clip, Asset } from '../../../../src/types';

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

const mockAsset: Asset = {
    id: 'asset-1',
    name: 'video.mp4',
    type: 'video',
    src: 'mock-url',
    duration: 100,
};

describe('ClipItem', () => {
  const defaultProps = {
    clip: mockClip,
    asset: mockAsset,
    zoomLevel: 10,
    onSelect: jest.fn(),
    onResize: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly positioned', () => {
    render(<ClipItem {...defaultProps} />);
    const clipElement = screen.getByTestId('clip-item-clip-1');
    expect(clipElement).toHaveStyle({
      left: '100px', // 10 * 10
      width: '50px', // 5 * 10
    });
  });

  it('renders asset name (shortened) instead of clip id', () => {
    // Width = 5 * 10 = 50px.
    // 50px - 16px padding = 34px.
    // 34 / 7 = 4 chars.
    // Name: video.mp4 -> video.
    // 4 chars < 5 -> Prefix only. "vide".
    render(<ClipItem {...defaultProps} />);

    expect(screen.getByText('vide')).toBeInTheDocument();

    // Check tooltip has full name
    const label = screen.getByTestId('clip-label');
    expect(label).toHaveAttribute('title', 'video.mp4');
  });

  it('renders clip id if asset is missing', () => {
      // clip.id = clip-1 (6 chars).
      // Width 50px -> 34px avail -> 4 chars.
      // clip-1 -> clip
      render(<ClipItem {...defaultProps} asset={undefined} />);
      expect(screen.getByText('clip')).toBeInTheDocument();

      const label = screen.getByTestId('clip-label');
      expect(label).toHaveAttribute('title', 'clip-1');
  });

  it('renders thumbnail if present', () => {
    const assetWithThumb = { ...mockAsset, thumbnail: 'blob:thumb-url' };
    render(<ClipItem {...defaultProps} asset={assetWithThumb} />);
    const thumb = screen.getByTestId('clip-thumbnail');
    expect(thumb).toBeInTheDocument();
    expect(thumb).toHaveStyle({ backgroundImage: 'url(blob:thumb-url)' });
  });

  it('calls onSelect when clicked', () => {
    render(<ClipItem {...defaultProps} />);
    const clipElement = screen.getByTestId('clip-item-clip-1');
    fireEvent.click(clipElement);
    expect(defaultProps.onSelect).toHaveBeenCalledWith('clip-1');
  });

  it('applies correct color class for video', () => {
    render(<ClipItem {...defaultProps} clip={{ ...mockClip, type: 'video' }} />);
    const clipElement = screen.getByTestId('clip-item-clip-1');
    expect(clipElement.className).toContain('bg-blue-600/80');
  });

  it('applies correct color class for audio', () => {
    render(<ClipItem {...defaultProps} clip={{ ...mockClip, type: 'audio' }} />);
    const clipElement = screen.getByTestId('clip-item-clip-1');
    expect(clipElement.className).toContain('bg-emerald-600/80');
  });

  it('applies correct color class for map', () => {
    render(<ClipItem {...defaultProps} clip={{ ...mockClip, type: 'map' }} />);
    const clipElement = screen.getByTestId('clip-item-clip-1');
    expect(clipElement.className).toContain('bg-orange-600/80');
  });

  it('calls onResize when dragging right handle', () => {
    render(<ClipItem {...defaultProps} />);
    const clipElement = screen.getByTestId('clip-item-clip-1');
    const handles = clipElement.querySelectorAll('div.absolute');
    const rightHandle = Array.from(handles || []).find(el => el.className.includes('cursor-e-resize'));

    expect(rightHandle).toBeInTheDocument();

    if (rightHandle) {
        // Use MouseEvent for down to ensure properties are passed
        const downEvent = new MouseEvent('pointerdown', {
            bubbles: true,
            clientX: 100,
            cancelable: true,
        });
        fireEvent(rightHandle, downEvent);

        // Move
        const moveEvent = new MouseEvent('pointermove', {
            bubbles: true,
            clientX: 120,
            cancelable: true,
        });
        fireEvent(window, moveEvent);

        expect(defaultProps.onResize).toHaveBeenCalledWith('clip-1', 10, 7, 0);

        fireEvent.pointerUp(window);
    }
  });

  it('calls onResize when dragging left handle', () => {
    render(<ClipItem {...defaultProps} />);
    const clipElement = screen.getByTestId('clip-item-clip-1');
    const handles = clipElement.querySelectorAll('div.absolute');
    const leftHandle = Array.from(handles || []).find(el => el.className.includes('cursor-w-resize'));

    expect(leftHandle).toBeInTheDocument();

    if (leftHandle) {
        const downEvent = new MouseEvent('pointerdown', {
            bubbles: true,
            clientX: 100,
            cancelable: true,
        });
        fireEvent(leftHandle, downEvent);

        const moveEvent = new MouseEvent('pointermove', {
            bubbles: true,
            clientX: 110,
            cancelable: true,
        });
        fireEvent(window, moveEvent);

        // start: 10 + 1 = 11
        // duration: 5 - 1 = 4
        // offset: 0 + 1 = 1
        expect(defaultProps.onResize).toHaveBeenCalledWith('clip-1', 11, 4, 1);

        fireEvent.pointerUp(window);
    }
  });

  it('shows tooltip when resizing', () => {
    render(<ClipItem {...defaultProps} />);
    const clipElement = screen.getByTestId('clip-item-clip-1');
    const handles = clipElement.querySelectorAll('div.absolute');
    const rightHandle = Array.from(handles || []).find(el => el.className.includes('cursor-e-resize'));

    if (rightHandle) {
        // Start resize
        fireEvent(rightHandle, new MouseEvent('pointerdown', { bubbles: true }));

        // Check for tooltip
        expect(screen.getByTestId('resize-tooltip')).toBeInTheDocument();
        expect(screen.getByText(/End:/)).toBeInTheDocument();

        // End resize
        fireEvent.pointerUp(window);

        // Tooltip should be gone
        expect(screen.queryByTestId('resize-tooltip')).not.toBeInTheDocument();
    }
  });
});
