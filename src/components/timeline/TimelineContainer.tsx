import React, { useRef, useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  DragStartEvent,
  DragMoveEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';

import { Track, Clip, Asset, ProjectSettings } from '../../types';
import { TrackLane } from './TrackLane';
import { TrackHeader } from './TrackHeader';
import { Ruler } from './Ruler';
import { Playhead } from './Playhead';
import { ZoomControls } from './ZoomControls';
import { ContextMenu } from './ContextMenu';
import {
  checkCollision,
  getSnapPoints,
  findNearestSnapPoint,
  findNearestValidTime,
} from '../../utils/timelineUtils';

interface TimelineContainerProps {
  tracks: Record<string, Track>;
  clips: Record<string, Clip>;
  assets: Record<string, Asset>;
  trackOrder: string[];
  zoomLevel: number;
  setZoomLevel: (z: number) => void;
  snapToGrid: boolean;
  allowOverlaps: boolean;
  setSettings: (settings: Partial<ProjectSettings>) => void;
  onMoveClip: (id: string, newStart: number, newTrackId?: string) => void;
  onResizeClip: (id: string, newDuration: number, newOffset: number) => void;
  onRemoveTrack: (id: string) => void;
  onRemoveClip: (id: string) => void;
  onDuplicateClip: (id: string) => void;
  onSplitClip: (id: string, time: number) => void;
  onRippleDeleteClip: (id: string) => void;
  onAddTrack?: () => void;
  selectedClipId?: string | null;
  onClipSelect?: (id: string | null) => void;
  currentTime: number;
  isPlaying: boolean;
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

export const TimelineContainer: React.FC<TimelineContainerProps> = ({
  tracks,
  clips,
  assets,
  trackOrder,
  zoomLevel,
  setZoomLevel,
  snapToGrid,
  allowOverlaps,
  setSettings,
  onMoveClip,
  onResizeClip,
  onRemoveTrack,
  onRemoveClip,
  onDuplicateClip,
  onSplitClip,
  onRippleDeleteClip,
  onAddTrack,
  selectedClipId,
  onClipSelect,
  currentTime,
  isPlaying,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [snapLine, setSnapLine] = useState<number | null>(null);
  const [isValidDrop, setIsValidDrop] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1000);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Wait for 5px drag before activating to allow clicks
      },
    })
  );

  // Handle Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoomLevel * zoomDelta, 1), 500); // Clamp between 1 and 500
      setZoomLevel(newZoom);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  // Auto-scroll to keep playhead in view
  useEffect(() => {
    if (!isPlaying || !scrollContainerRef.current) return;

    const playheadPos = currentTime * zoomLevel;
    const container = scrollContainerRef.current;
    const width = container.clientWidth;
    const scrollPos = container.scrollLeft;

    // Scroll if playhead is near the right edge or out of view
    if (playheadPos > scrollPos + width - 100) {
        container.scrollTo({ left: playheadPos - 100, behavior: 'smooth' });
    }
  }, [currentTime, isPlaying, zoomLevel]);

  // Update container width on resize
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            setContainerWidth(entry.contentRect.width);
        }
    });
    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsValidDrop(true);
    setSnapLine(null);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over, delta } = event;

    if (!active) return;

    // Clear snap line by default
    setSnapLine(null);
    setIsValidDrop(true);

    const clipId = active.id as string;
    const clip = clips[clipId];
    if (!clip) return;

    // Calculate potentially new start time
    const deltaSeconds = delta.x / zoomLevel;
    let newStart = clip.start + deltaSeconds;
    newStart = Math.max(0, newStart);

    if (snapToGrid) {
        // Check snapping for visual feedback
        const snapPoints = getSnapPoints(clips, currentTime);
        const snapTolerance = 10 / zoomLevel;

        const snappedStart = findNearestSnapPoint(newStart, snapPoints, snapTolerance);
        if (snappedStart !== null) {
            setSnapLine(snappedStart);
            newStart = snappedStart;
        } else {
            const newEnd = newStart + clip.duration;
            const snappedEnd = findNearestSnapPoint(newEnd, snapPoints, snapTolerance);
            if (snappedEnd !== null) {
                setSnapLine(snappedEnd);
                newStart = snappedEnd - clip.duration;
            }
        }
    }

    // Check collision
    if (over) {
        const targetTrackId = over.id as string;
        const targetTrack = tracks[targetTrackId];

        if (targetTrack) {
            const trackClips = targetTrack.clips
                .map(id => clips[id])
                .filter(c => c && c.id !== clipId);

            if (checkCollision(newStart, clip.duration, trackClips)) {
                if (!allowOverlaps) {
                    setIsValidDrop(false);
                }
            }
        }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveId(null);
    setSnapLine(null);
    setIsValidDrop(true);

    if (active && over) {
      const clipId = active.id as string;
      const clip = clips[clipId];

      if (!clip) return;

      const targetTrackId = over.id as string;
      const targetTrack = tracks[targetTrackId];

      // Calculate new start time based on drag delta
      // delta.x is in pixels. We need to convert to seconds.
      const deltaSeconds = delta.x / zoomLevel;
      let newStart = clip.start + deltaSeconds;
      newStart = Math.max(0, newStart); // Prevent negative time

      // Get clips on target track (excluding current clip if moving within same track)
      const trackClips = (targetTrack?.clips || [])
        .map((id) => clips[id])
        .filter((c) => c && c.id !== clipId);

      // 1. Snapping
      if (snapToGrid) {
          const snapPoints = getSnapPoints(clips, currentTime);
          const snapTolerance = 10 / zoomLevel; // 10 pixels tolerance

          // Check snap for start
          const snappedStart = findNearestSnapPoint(
            newStart,
            snapPoints,
            snapTolerance
          );
          if (snappedStart !== null) {
            newStart = snappedStart;
          } else {
            // Check snap for end
            const newEnd = newStart + clip.duration;
            const snappedEnd = findNearestSnapPoint(
              newEnd,
              snapPoints,
              snapTolerance
            );
            if (snappedEnd !== null) {
              newStart = snappedEnd - clip.duration;
            }
          }
      }

      // 2. Collision Check & Resolution
      if (checkCollision(newStart, clip.duration, trackClips)) {
        if (!allowOverlaps) {
            // Collision! Find nearest valid spot
            // Use a slightly larger tolerance for "valid slot" finding to be helpful
            const snapTolerance = 10 / zoomLevel;
            const validStart = findNearestValidTime(
              newStart,
              clip.duration,
              trackClips,
              snapTolerance * 2
            );

            if (validStart !== null) {
              newStart = validStart;
            } else {
              // Reject move (snap back)
              return;
            }
        }
        // If allowOverlaps is true, we just proceed with newStart (even if colliding)
      }

      onMoveClip(clipId, newStart, targetTrackId);
    }
  };

  const handleResize = (id: string, newStart: number, newDuration: number, newOffset: number) => {
    // If start changed, move first
    const clip = clips[id];
    if (!clip) return;

    const track = tracks[clip.trackId];
    if (!track) return;

    // Get clips on same track excluding self
    const trackClips = track.clips
      .map((cId) => clips[cId])
      .filter((c) => c && c.id !== id);

    // Check collision
    if (checkCollision(newStart, newDuration, trackClips)) {
      if (!allowOverlaps) {
          // Reject resize if it causes collision
          return;
      }
    }

    if (newStart !== clip.start) {
      onMoveClip(id, newStart);
    }

    // Update duration and offset
    if (newDuration !== clip.duration || newOffset !== clip.offset) {
      onResizeClip(id, newDuration, newOffset);
    }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; clipId: string } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, clipId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, clipId });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedClipId && (e.key === 'Delete' || e.key === 'Backspace')) {
        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return;

        e.preventDefault();
        onRemoveClip(selectedClipId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, onRemoveClip]);

  const handleZoomToFit = () => {
    if (!scrollContainerRef.current) return;

    let maxTime = 0;
    const clipList = Object.values(clips);
    if (clipList.length === 0) return;

    clipList.forEach((clip) => {
      const end = clip.start + clip.duration;
      if (end > maxTime) maxTime = end;
    });

    maxTime = Math.max(maxTime * 1.1, 10); // Add buffer

    const width = scrollContainerRef.current.clientWidth;
    const newZoom = width / maxTime;
    setZoomLevel(Math.min(Math.max(newZoom, 0.1), 500));
  };

  const activeClip = activeId ? clips[activeId] : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full bg-gray-950 text-gray-300 select-none">
        {/* Top Bar / Toolbar */}
        <div className="h-10 bg-gray-900 border-b border-gray-700 flex items-center px-4 justify-between sticky top-0 z-30">
           <div className="flex items-center gap-4">
               <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">TIMELINE</div>
               <div className="flex items-center gap-3 border-l border-gray-700 pl-4">
                  <label className="flex items-center gap-1 text-xs text-gray-400 hover:text-white cursor-pointer select-none">
                    <input
                        type="checkbox"
                        className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                        checked={snapToGrid}
                        onChange={(e) => setSettings({ snapToGrid: e.target.checked })}
                    />
                    Snap
                  </label>
                   <label className="flex items-center gap-1 text-xs text-gray-400 hover:text-white cursor-pointer select-none">
                    <input
                        type="checkbox"
                        className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                        checked={allowOverlaps}
                        onChange={(e) => setSettings({ allowOverlaps: e.target.checked })}
                    />
                    Overlap
                  </label>
               </div>
           </div>

           <ZoomControls
             zoomLevel={zoomLevel}
             setZoomLevel={setZoomLevel}
             min={1}
             max={200}
             onZoomToFit={handleZoomToFit}
           />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Track Headers (Fixed Left) */}
          <div className="flex flex-col bg-gray-900 z-20 border-r border-gray-700 shadow-lg overflow-y-auto no-scrollbar pt-[30px]">
            {trackOrder.map(trackId => {
                const track = tracks[trackId];
                if (!track) return null;
                return (
                    <TrackHeader
                        key={trackId}
                        track={track}
                        onRemove={onRemoveTrack}
                    />
                );
            })}
            {/* Add Track Button */}
            <button
              className="h-16 flex items-center justify-center border-b border-gray-800 text-xs text-gray-500 hover:text-white hover:bg-gray-800 w-full transition-colors"
              onClick={onAddTrack}
            >
              + Add Track
            </button>
          </div>

          {/* Timeline Content (Scrollable) */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-auto relative"
            onWheel={handleWheel}
            onScroll={handleScroll}
            onClick={() => onClipSelect?.(null)}
          >
             <div className="min-w-full relative" style={{ width: 'max-content' }}>
                <Playhead zoomLevel={zoomLevel} />

                {/* Ruler */}
                <div className="sticky top-0 z-10 h-[30px]">
                  <Ruler
                    zoomLevel={zoomLevel}
                    scrollLeft={scrollLeft}
                    containerWidth={containerWidth}
                  />
                </div>

                {/* Snap Line */}
                {snapLine !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-yellow-400 z-50 pointer-events-none shadow-[0_0_4px_rgba(250,204,21,0.8)]"
                    style={{ left: `${snapLine * zoomLevel}px` }}
                    data-testid="snap-line"
                  />
                )}

                {/* Tracks */}
                {trackOrder.map(trackId => {
                    const track = tracks[trackId];
                    if (!track) return null;

                    const trackClips = track.clips
                        .map(clipId => clips[clipId])
                        .filter(Boolean);

                    return (
                        <TrackLane
                            key={trackId}
                            track={track}
                            clips={trackClips}
                            assets={assets}
                            zoomLevel={zoomLevel}
                            selectedClipId={selectedClipId}
                            onClipSelect={onClipSelect}
                            onClipResize={handleResize}
                            onContextMenu={handleContextMenu}
                        />
                    );
                })}
                 {/* Add Track Lane Placeholder */}
                <div className="h-16 border-b border-gray-800 bg-gray-900/20" />
             </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeClip ? (
          <div
            style={{
                width: `${activeClip.duration * zoomLevel}px`,
                height: '100%'
            }}
            className={`
                rounded border text-white text-xs flex items-center overflow-hidden shadow-xl opacity-80 transition-colors duration-100
                ${isValidDrop ? 'border-blue-500 bg-blue-600/80' : 'border-red-500 bg-red-600/80 ring-2 ring-red-500'}
            `}
            data-testid="drag-overlay-preview"
          >
             <span className="px-2 truncate">{activeClip.id}</span>
             {!isValidDrop && <span className="ml-2">🚫</span>}
          </div>
        ) : null}
      </DragOverlay>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={[
            {
              label: 'Split Clip',
              onClick: () => onSplitClip(contextMenu.clipId, currentTime),
              disabled: (() => {
                const clip = clips[contextMenu.clipId];
                if (!clip) return true;
                // Only allow split if playhead is strictly inside the clip
                return currentTime <= clip.start || currentTime >= clip.start + clip.duration;
              })(),
            },
            {
              label: 'Duplicate Clip',
              onClick: () => onDuplicateClip(contextMenu.clipId),
            },
            {
              label: 'Ripple Delete',
              onClick: () => onRippleDeleteClip(contextMenu.clipId),
              danger: true,
            },
            {
              label: 'Delete Clip',
              onClick: () => onRemoveClip(contextMenu.clipId),
              danger: true,
            },
          ]}
        />
      )}
    </DndContext>
  );
};
