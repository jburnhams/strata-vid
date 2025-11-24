import React, { useCallback, useState } from 'react';
import { Clip, Asset } from '../../types';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { formatTime } from '../../utils/timeUtils';

interface ClipItemProps {
  clip: Clip;
  asset?: Asset;
  zoomLevel: number;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onResize?: (id: string, newStart: number, newDuration: number, newOffset: number) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
}

export const ClipItem: React.FC<ClipItemProps> = ({
  clip,
  asset,
  zoomLevel,
  isSelected,
  onSelect,
  onResize,
  onContextMenu
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
        return 'border-blue-500 bg-blue-600/80';
      case 'audio':
        return 'border-emerald-500 bg-emerald-600/80';
      case 'map':
        return 'border-orange-500 bg-orange-600/80';
      case 'image':
      case 'text':
      case 'html':
        return 'border-purple-500 bg-purple-600/80';
      default:
        return 'border-gray-500 bg-gray-600/80';
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        rounded border ${getClipColorClasses(clip.type)} text-white text-xs
        flex items-center overflow-hidden cursor-move select-none group transition-shadow duration-100
        ${isSelected ? 'ring-2 ring-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)] z-10' : ''}
        ${isDragging ? 'opacity-50' : ''}
        hover:brightness-110 relative
      `}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(clip.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(clip.id); // Also select on right click
        onContextMenu?.(e, clip.id);
      }}
      {...attributes}
      {...listeners}
    >
      {/* Thumbnail Background */}
      {asset?.thumbnail && (
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

      <span className="px-2 truncate z-10 font-medium drop-shadow-md">
        {clip.id}
      </span>

      {/* Resize Tooltip */}
      {resizeState && (
        <div
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow border border-gray-600 z-50 whitespace-nowrap"
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
        className="absolute left-0 w-2 h-full cursor-w-resize hover:bg-white/20 z-20"
        onPointerDown={(e) => handleResizeStart(e, 'left')}
      />
      <div
        className="absolute right-0 w-2 h-full cursor-e-resize hover:bg-white/20 z-20"
        onPointerDown={(e) => handleResizeStart(e, 'right')}
      />
    </div>
  );
};
