import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Track, Clip, Asset, ProjectSettings, Transition, Marker } from '../../types';
import { Marker as MarkerComponent } from './Marker';
import { TrackLane } from './TrackLane';
import { TrackHeader } from './TrackHeader';
import { Ruler } from './Ruler';
import { Playhead } from './Playhead';
import { ZoomControls } from './ZoomControls';
import { ContextMenu } from './ContextMenu';

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
  onToggleTrackMute?: (id: string) => void;
  onToggleTrackLock?: (id: string) => void;
  onRemoveClip: (id: string) => void;
  onDuplicateClip: (id: string) => void;
  onSplitClip: (id: string, time: number) => void;
  onRippleDeleteClip: (id: string) => void;
  onAddTransition: (id: string, transition: Transition) => void;
  onAddTrack?: () => void;
  onAddMarker?: () => void;
  selectedClipId?: string | null;
  onClipSelect?: (id: string | null) => void;
  currentTime: number;
  isPlaying: boolean;
  markers?: Marker[];
  onMarkerClick?: (id: string) => void;
  externalSnapLine?: number | null;
  externalIsValidDrop?: boolean;
}

export const TimelineContainer = forwardRef<HTMLDivElement, TimelineContainerProps>(({
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
  onToggleTrackMute,
  onToggleTrackLock,
  onRemoveClip,
  onDuplicateClip,
  onSplitClip,
  onRippleDeleteClip,
  onAddTransition,
  onAddTrack,
  onAddMarker,
  selectedClipId,
  onClipSelect,
  currentTime,
  isPlaying,
  markers,
  onMarkerClick,
  externalSnapLine,
  externalIsValidDrop = true
}, ref) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1000);

  // Forward the internal ref to the parent
  useImperativeHandle(ref, () => scrollContainerRef.current as HTMLDivElement);

  // Calculate total duration for container width
  const totalDuration = useMemo(() => {
    let max = 0;
    Object.values(clips).forEach(c => {
      const end = c.start + c.duration;
      if (end > max) max = end;
    });
    return max;
  }, [clips]);

  // Ensure container width accommodates all clips plus some buffer
  const contentWidth = Math.max(containerWidth, totalDuration * zoomLevel + 200);

  // Virtualization - Visible time range
  const visibleStartTime = scrollLeft / zoomLevel;
  const visibleEndTime = (scrollLeft + containerWidth) / zoomLevel;
  const bufferPixels = 500;
  const bufferTime = bufferPixels / zoomLevel;

  const isClipVisible = (clip: Clip) => {
    // Note: We don't check for active drag ID here because active drag overlay is now handled in App.tsx
    // However, if we wanted to hide the original clip while dragging, we'd need that info.
    // For now, standard behavior is often to keep it visible or ghosted.
    // Since App.tsx handles the drag overlay, we just render what's in the store.
    const clipEnd = clip.start + clip.duration;
    return clip.start <= (visibleEndTime + bufferTime) && clipEnd >= (visibleStartTime - bufferTime);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoomLevel * zoomDelta, 1), 500);
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

  return (
      <div className="flex flex-col h-full bg-gray-950 text-gray-300 select-none">
        {/* Top Bar / Toolbar */}
        <div className="h-10 bg-gray-900 border-b border-gray-700 flex items-center px-4 justify-between sticky top-0 z-30">
           <div className="flex items-center gap-4">
               <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">TIMELINE</div>
               <button
                   className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-[10px] text-gray-300 transition-colors"
                   onClick={onAddMarker}
                   title="Add Marker at Playhead"
               >
                   + Marker
               </button>
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
                        onToggleMute={onToggleTrackMute}
                        onToggleLock={onToggleTrackLock}
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
             <div className="min-w-full relative" style={{ width: `${contentWidth}px` }}>
                <Playhead zoomLevel={zoomLevel} />

                {/* Ruler */}
                <div className="sticky top-0 z-10 h-[30px]">
                  <Ruler
                    zoomLevel={zoomLevel}
                    scrollLeft={scrollLeft}
                    containerWidth={containerWidth}
                  />
                  {markers?.map((marker) => (
                    <MarkerComponent
                      key={marker.id}
                      marker={marker}
                      zoomLevel={zoomLevel}
                      onClick={onMarkerClick}
                    />
                  ))}
                </div>

                {/* External Snap Line (from props) */}
                {externalSnapLine !== null && externalSnapLine !== undefined && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-yellow-400 z-50 pointer-events-none shadow-[0_0_4px_rgba(250,204,21,0.8)]"
                    style={{ left: `${externalSnapLine * zoomLevel}px` }}
                    data-testid="snap-line"
                  />
                )}

                {/* Tracks */}
                {trackOrder.map(trackId => {
                    const track = tracks[trackId];
                    if (!track) return null;

                    const trackClips = track.clips
                        .map(clipId => clips[clipId])
                        .filter(Boolean)
                        .filter(isClipVisible);

                    return (
                        <TrackLane
                            key={trackId}
                            track={track}
                            clips={trackClips}
                            assets={assets}
                            zoomLevel={zoomLevel}
                            selectedClipId={selectedClipId}
                            onClipSelect={onClipSelect}
                            onClipResize={(id, newStart, newDuration, newOffset) => {
                                // Delegate resize to parent handler or implement directly
                                onResizeClip(id, newDuration, newOffset);
                                if (newStart !== clips[id]?.start) {
                                    onMoveClip(id, newStart);
                                }
                            }}
                            onContextMenu={handleContextMenu}
                        />
                    );
                })}
                 {/* Add Track Lane Placeholder */}
                <div className="h-16 border-b border-gray-800 bg-gray-900/20" />
             </div>
          </div>
        </div>

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
              label: 'Add Crossfade (1s)',
              onClick: () => onAddTransition(contextMenu.clipId, { type: 'crossfade', duration: 1 }),
              disabled: (() => {
                  const clip = clips[contextMenu.clipId];
                  if (!clip) return true;
                  const track = tracks[clip.trackId];
                  if (!track) return true;
                  const trackClips = track.clips.map(id => clips[id]).filter(Boolean).sort((a, b) => a.start - b.start);
                  const index = trackClips.findIndex(c => c.id === clip.id);
                  return index <= 0; // Disable if first clip
              })()
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
      </div>
  );
});

TimelineContainer.displayName = 'TimelineContainer';
