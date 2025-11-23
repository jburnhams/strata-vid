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
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500 drop-shadow-md" />

        {/* Line */}
        <div className="w-[1px] h-full bg-red-500 group-hover:bg-red-400 group-hover:w-[2px] transition-all shadow-[0_0_4px_rgba(0,0,0,0.5)]" />

        {/* Tooltip on Hover/Drag */}
        <div className={`absolute top-[-25px] bg-neutral-800 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 ${isDragging ? 'opacity-100' : ''} transition-opacity whitespace-nowrap border border-neutral-600`}>
            {currentTime.toFixed(2)}s
        </div>
    </div>
  );
};
