import React, { useRef, useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  DragStartEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  Modifier,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

import { Track, Clip } from '../../types';
import { TrackLane } from './TrackLane';
import { TrackHeader } from './TrackHeader';
import { ClipItem } from './ClipItem';
import { Ruler } from './Ruler';
import { Playhead } from './Playhead';
import {
  checkCollision,
  getSnapPoints,
  findNearestSnapPoint,
  findNearestValidTime,
} from '../../utils/timelineUtils';

interface TimelineContainerProps {
  tracks: Record<string, Track>;
  clips: Record<string, Clip>;
  trackOrder: string[];
  zoomLevel: number;
  setZoomLevel: (z: number) => void;
  onMoveClip: (id: string, newStart: number, newTrackId?: string) => void;
  onResizeClip: (id: string, newDuration: number, newOffset: number) => void;
  onRemoveTrack: (id: string) => void;
  onAddTrack?: () => void;
  selectedClipId?: string | null;
  onClipSelect?: (id: string) => void;
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
  trackOrder,
  zoomLevel,
  setZoomLevel,
  onMoveClip,
  onResizeClip,
  onRemoveTrack,
  onAddTrack,
  selectedClipId,
  onClipSelect,
  currentTime,
  isPlaying,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
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
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveId(null);

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
      const snapPoints = getSnapPoints(clips, currentTime);
      // We snap the start or end of the clip to the snap points
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

      // 2. Collision Check & Resolution
      if (checkCollision(newStart, clip.duration, trackClips)) {
        // Collision! Find nearest valid spot
        // Use a slightly larger tolerance for "valid slot" finding to be helpful
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
          // We just don't call onMoveClip
          return;
        }
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
      // Reject resize if it causes collision
      return;
    }

    if (newStart !== clip.start) {
      onMoveClip(id, newStart);
    }

    // Update duration and offset
    if (newDuration !== clip.duration || newOffset !== clip.offset) {
      onResizeClip(id, newDuration, newOffset);
    }
  };

  const activeClip = activeId ? clips[activeId] : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full bg-gray-950 text-gray-300 select-none">
        {/* Top Bar / Toolbar */}
        <div className="h-8 bg-gray-900 border-b border-gray-700 flex items-center px-2 sticky top-0 z-30">
           {/* Simple zoom controls */}
           <div className="flex gap-2 text-xs">
             <button onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}>-</button>
             <span>Zoom: {zoomLevel.toFixed(1)}px/s</span>
             <button onClick={() => setZoomLevel(Math.min(500, zoomLevel + 1))}>+</button>
           </div>
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
                            zoomLevel={zoomLevel}
                            selectedClipId={selectedClipId}
                            onClipSelect={onClipSelect}
                            onClipResize={handleResize}
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
            className="rounded border border-blue-500 bg-blue-600/80 text-white text-xs flex items-center overflow-hidden shadow-xl opacity-80"
          >
             <span className="px-2 truncate">{activeClip.id}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
