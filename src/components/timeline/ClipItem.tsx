import { ContextMenu, type MenuEntry } from 'strata-react';
import React, { useCallback, useState } from 'react';
import type { Clip, Asset, TrackViewMode } from '../../types';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { formatTime } from '../../utils/timeUtils';
import { smartShortenFilename } from '../../utils/textUtils';
import { WaveformOverlay } from './WaveformOverlay';

interface ClipItemProps {
  clip: Clip;
  asset?: Asset;
  zoomLevel: number;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onResize?: (id: string, newStart: number, newDuration: number, newOffset: number) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
  /** When given, the clip opens strata-react's `ContextMenu` with these items. */
  menuItems?: readonly MenuEntry[];
  viewMode?: TrackViewMode;
}

export const ClipItem: React.FC<ClipItemProps> = ({
  clip,
  asset,
  zoomLevel,
  isSelected,
  onSelect,
  onResize,
  onContextMenu,
  menuItems,
  viewMode = 'frames'
}) => {
  const [resizeState, setResizeState] = useState<{ direction: 'left' | 'right' } | null>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: clip.id,
    data: {
      type: 'Clip',
      clip,
    },
    disabled: !!resizeState // Disable drag when resizing
  });

  const getClipColorClasses = (type: Clip['type']) => {
    switch (type) {
      case 'video':
        return 'border-media-video bg-media-video/25';
      case 'audio':
        return 'border-media-audio bg-media-audio/25';
      case 'map':
        return 'border-media-map bg-media-map/25';
      case 'image':
      case 'text':
      case 'html':
        return 'border-media-image bg-media-image/25';
      default:
        return 'border-input bg-muted';
    }
  };

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    left: `${clip.start * zoomLevel}px`,
    width: `${clip.duration * zoomLevel}px`,
    position: 'absolute',
    height: '100%',
    zIndex: isDragging ? 999 : 1,
    touchAction: 'none',
  };

  const handleResizeStart = useCallback((e: React.PointerEvent, direction: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();

    setResizeState({ direction });

    const startX = e.clientX;
    const originalStart = clip.start;
    const originalDuration = clip.duration;
    const originalOffset = clip.offset;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSeconds = deltaX / zoomLevel;

      if (direction === 'left') {
        // Changing start time, duration and offset
        const newStart = Math.max(0, originalStart + deltaSeconds);
        const shift = newStart - originalStart; // Actual shift after clamping start >= 0
        const newDuration = Math.max(0.1, originalDuration - shift);
        const newOffset = Math.max(0, originalOffset + shift);

        onResize?.(clip.id, newStart, newDuration, newOffset);
      } else {
        // Changing duration only
        const newDuration = Math.max(0.1, originalDuration + deltaSeconds);
        onResize?.(clip.id, originalStart, newDuration, originalOffset);
      }
    };

    const handlePointerUp = () => {
      setResizeState(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [clip, zoomLevel, onResize]);

  // Determine display text
  const displayName = asset?.name || clip.id;
  const pixelWidth = clip.duration * zoomLevel;
  const shortenedName = asset
    ? smartShortenFilename(asset.name, pixelWidth)
    : smartShortenFilename(clip.id, pixelWidth); // Fallback to clip id using same logic if needed, or just full id

  const body = (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`clip-item-${clip.id}`}
      className={`
        rounded-control border ${getClipColorClasses(clip.type)} text-foreground type-caption
        flex items-center overflow-hidden cursor-move select-none group transition-state
        ${isSelected ? 'ring-2 ring-foreground z-10' : ''}
        ${isDragging ? 'opacity-50' : ''}
        hover:brightness-110 relative
      `}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(clip.id);
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        onSelect?.(clip.id); // Also select on right click
        if (menuItems) return; // the ContextMenu around this element opens and prevents the browser's
        e.preventDefault();
        onContextMenu?.(e, clip.id);
      }}
      {...attributes}
      {...listeners}
    >
      {/* Thumbnail Background - Show if viewMode is 'frames' or 'both' */}
      {asset?.thumbnail && (viewMode === 'frames' || viewMode === 'both') && (
        <div
          className="absolute inset-0 z-0 opacity-40 pointer-events-none"
          style={{
             backgroundImage: `url(${asset.thumbnail})`,
             backgroundSize: 'auto 100%',
             backgroundRepeat: 'repeat-x'
          }}
          data-testid="clip-thumbnail"
        />
      )}

      {/* Waveform Overlay - Show if viewMode is 'waveform' or 'both' OR if it's an audio clip */}
      {asset?.waveform && (clip.type === 'audio' || viewMode === 'waveform' || viewMode === 'both') && (
        <WaveformOverlay
          waveform={asset.waveform}
          assetDuration={asset.duration || 0}
          offset={clip.offset}
          duration={clip.duration}
          playbackRate={clip.playbackRate || 1}
          color={clip.type === 'video' ? "rgba(0, 100, 255, 0.5)" : "rgba(255, 255, 255, 0.6)"}
        />
      )}

      <span
        className="px-2 truncate z-10 font-medium"
        title={displayName} // Tooltip with full name
        data-testid="clip-label"
      >
        {shortenedName || displayName /* Fallback to standard truncation if empty */}
      </span>

      {/* Resize Tooltip */}
      {resizeState && (
        <div
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-card text-foreground type-caption px-2 py-1 rounded-control shadow-overlay border border-input z-50 whitespace-nowrap"
            data-testid="resize-tooltip"
        >
            {resizeState.direction === 'left' ? (
                <span>Start: {formatTime(clip.start)} ({formatTime(clip.duration)})</span>
            ) : (
                <span>End: {formatTime(clip.start + clip.duration)} ({formatTime(clip.duration)})</span>
            )}
        </div>
      )}

      {/* Resize Handles */}
      <div
        className="absolute left-0 w-2 h-full cursor-w-resize hover:bg-on-footage/20 z-20"
        onPointerDown={(e) => handleResizeStart(e, 'left')}
      />
      <div
        className="absolute right-0 w-2 h-full cursor-e-resize hover:bg-on-footage/20 z-20"
        onPointerDown={(e) => handleResizeStart(e, 'right')}
      />
    </div>
  );

  return menuItems ? <ContextMenu label={`Clip ${displayName}`} items={menuItems}>{body}</ContextMenu> : body;
};
