import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import type { Track, Clip, Asset, ProjectSettings, Transition, Marker } from '../../types';
import { Marker as MarkerComponent } from './Marker';
import { TrackLane } from './TrackLane';
import { TrackHeader } from './TrackHeader';
import { Ruler } from './Ruler';
import { Playhead } from './Playhead';
import { ZoomControls } from './ZoomControls';
import { Button, Toggle, Toolbar, ToolbarSeparator, type MenuEntry } from 'strata-react';
import { Copy, Scissors, Trash2 } from 'lucide-react';

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
  onUpdateTrackVolume?: (id: string, volume: number) => void;
  onToggleTrackViewMode?: (id: string) => void;
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
  onUpdateTrackVolume,
  onToggleTrackViewMode,
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

  // The clip's context menu, built when it opens: strata-react commands, so an item that cannot
  // run says why ("Move the playhead inside the clip") instead of only greying out.
  const clipMenu = (clipId: string): MenuEntry[] => {
    const clip = clips[clipId];
    const track = clip ? tracks[clip.trackId] : undefined;
    const trackClips = track ? track.clips.map(id => clips[id]).filter(Boolean).sort((a, b) => a.start - b.start) : [];
    const isFirst = trackClips.findIndex(c => c.id === clipId) <= 0;
    const playheadInside = !!clip && currentTime > clip.start && currentTime < clip.start + clip.duration;
    return [
      {
        id: 'split',
        label: 'Split clip',
        icon: Scissors,
        disabled: playheadInside ? false : 'Move the playhead inside the clip',
        run: () => onSplitClip(clipId, currentTime),
      },
      {
        id: 'crossfade',
        label: 'Add crossfade (1s)',
        disabled: isFirst ? 'No clip before it on this track' : false,
        run: () => onAddTransition(clipId, { type: 'crossfade', duration: 1 }),
      },
      { id: 'duplicate', label: 'Duplicate clip', icon: Copy, run: () => onDuplicateClip(clipId) },
      'separator',
      { id: 'ripple-delete', label: 'Ripple delete', destructive: true, run: () => onRippleDeleteClip(clipId) },
      { id: 'delete', label: 'Delete clip', icon: Trash2, destructive: true, run: () => onRemoveClip(clipId) },
    ];
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
      <div className="flex flex-col h-full bg-background text-foreground select-none">
        {/* Top Bar / Toolbar */}
        <div className="h-10 bg-background border-b border-border flex items-center px-4 justify-between sticky top-0 z-30">
           <div className="flex items-center gap-4">
               <div className="type-caption text-muted-foreground font-medium uppercase tracking-wider">TIMELINE</div>
               <Toolbar label="Timeline editing" className="flex items-center gap-2">
                 <Button size="sm" onClick={onAddMarker}>Add marker</Button>
                 <ToolbarSeparator />
                 <Toggle size="sm" label="Snap" pressed={snapToGrid} onChange={(on) => setSettings({ snapToGrid: on })} />
                 <Toggle size="sm" label="Allow overlaps" pressed={allowOverlaps} onChange={(on) => setSettings({ allowOverlaps: on })} />
               </Toolbar>
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
          <div className="flex flex-col bg-background z-20 border-r border-border shadow-overlay overflow-y-auto no-scrollbar pt-[30px]">
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
                        onUpdateVolume={onUpdateTrackVolume}
                        onToggleViewMode={onToggleTrackViewMode}
                    />
                );
            })}
            {/* Add Track Button */}
            <button
              className="h-16 flex items-center justify-center border-b border-border type-caption text-muted-foreground hover:text-foreground hover:bg-card w-full transition-state"
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
                    className="absolute top-0 bottom-0 w-px bg-foreground z-50 pointer-events-none"
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
                            clipMenu={clipMenu}
                        />
                    );
                })}
                 {/* Add Track Lane Placeholder */}
                <div className="h-16 border-b border-border bg-background/20" />
             </div>
          </div>
        </div>

      </div>
  );
});

TimelineContainer.displayName = 'TimelineContainer';
