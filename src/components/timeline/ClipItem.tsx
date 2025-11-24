import React, { useCallback } from 'react';
import { Clip } from '../../types';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface ClipItemProps {
  clip: Clip;
  zoomLevel: number;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onResize?: (id: string, newStart: number, newDuration: number, newOffset: number) => void;
}

export const ClipItem: React.FC<ClipItemProps> = ({
  clip,
  zoomLevel,
  isSelected,
  onSelect,
  onResize
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: clip.id,
    data: {
      type: 'Clip',
      clip,
    },
    disabled: false // We might want to disable drag when resizing
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
        hover:brightness-110
      `}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(clip.id);
      }}
      {...attributes}
      {...listeners}
    >
      <span className="px-2 truncate">
        {clip.id}
      </span>

      {/* Resize Handles */}
      <div
        className="absolute left-0 w-2 h-full cursor-w-resize hover:bg-white/20 z-10"
        onPointerDown={(e) => handleResizeStart(e, 'left')}
      />
      <div
        className="absolute right-0 w-2 h-full cursor-e-resize hover:bg-white/20 z-10"
        onPointerDown={(e) => handleResizeStart(e, 'right')}
      />
    </div>
  );
};
