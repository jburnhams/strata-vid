import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';

interface PlayheadProps {
  zoomLevel: number;
}

export const Playhead: React.FC<PlayheadProps> = ({ zoomLevel }) => {
  const currentTime = useProjectStore((state) => state.currentTime);
  const setPlaybackState = useProjectStore((state) => state.setPlaybackState);

  const [isDragging, setIsDragging] = useState(false);

  const left = currentTime * zoomLevel;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent interfering with track dragging
    setIsDragging(true);
    setPlaybackState({ isPlaying: false }); // Pause when scrubbing starts

    // Capture pointer to handle drag outside element
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();

      // Determine position relative to the parent container (the timeline content)
      const parent = (e.target as HTMLElement).offsetParent as HTMLElement;
      if (parent) {
          const rect = parent.getBoundingClientRect();
          // Calculate x relative to the start of the content
          // e.clientX is viewport x. rect.left is viewport x of parent left edge.
          const x = e.clientX - rect.left;

          const newTime = Math.max(0, x / zoomLevel);
          setPlaybackState({ currentTime: newTime });
      }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      (e.target as Element).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      data-testid="playhead"
      className="absolute top-0 bottom-0 w-4 -ml-2 z-50 flex flex-col items-center cursor-ew-resize group touch-none pointer-events-auto"
      style={{ left: `${left}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      // Also handle onPointerCancel or lost capture?
    >
        {/* Head (Triangle) */}
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-primary" />

        {/* Line */}
        <div className="w-[1px] h-full bg-primary group-hover:w-0.5" />

        {/* Tooltip on Hover/Drag */}
        <div className={`absolute top-[-25px] bg-card text-foreground type-caption px-1 rounded-control opacity-0 group-hover:opacity-100 ${isDragging ? 'opacity-100' : ''} transition-opacity whitespace-nowrap border border-input`}>
            {currentTime.toFixed(2)}s
        </div>
    </div>
  );
};
