import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { TimelineContainer } from './timeline/TimelineContainer';

export const TimelinePanel: React.FC = () => {
  // Connect to store
  const tracks = useProjectStore((state) => state.tracks);
  const clips = useProjectStore((state) => state.clips);
  const assets = useProjectStore((state) => state.assets);
  const trackOrder = useProjectStore((state) => state.trackOrder);

  // Actions
  const moveClip = useProjectStore((state) => state.moveClip);
  const resizeClip = useProjectStore((state) => state.resizeClip);
  const duplicateClip = useProjectStore((state) => state.duplicateClip);
  const splitClip = useProjectStore((state) => state.splitClip);
  const rippleDeleteClip = useProjectStore((state) => state.rippleDeleteClip);
  const addTransition = useProjectStore((state) => state.addTransition);
  const removeClip = useProjectStore((state) => state.removeClip);
  const addTrack = useProjectStore((state) => state.addTrack);
  const removeTrack = useProjectStore((state) => state.removeTrack);
  const selectClip = useProjectStore((state) => state.selectClip);
  const setSettings = useProjectStore((state) => state.setSettings);

  // State
  const currentTime = useProjectStore((state) => state.currentTime);
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const selectedClipId = useProjectStore((state) => state.selectedClipId);
  const settings = useProjectStore((state) => state.settings);

  // Local state for UI
  const [zoomLevel, setZoomLevel] = useState(10); // pixels per second

  const handleAddTrack = () => {
    const id = `track-${Date.now()}`;
    addTrack({
      id,
      type: 'video',
      label: `Track ${trackOrder.length + 1}`,
      isMuted: false,
      isLocked: false,
      clips: [],
    });
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white overflow-hidden">
      <TimelineContainer
        tracks={tracks}
        clips={clips}
        assets={assets}
        trackOrder={trackOrder}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        snapToGrid={settings.snapToGrid ?? true}
        allowOverlaps={settings.allowOverlaps ?? false}
        setSettings={setSettings}
        onMoveClip={moveClip}
        onResizeClip={resizeClip}
        onDuplicateClip={duplicateClip}
        onSplitClip={splitClip}
        onRippleDeleteClip={rippleDeleteClip}
        onAddTransition={addTransition}
        onRemoveClip={removeClip}
        onRemoveTrack={removeTrack}
        onAddTrack={handleAddTrack}
        selectedClipId={selectedClipId}
        onClipSelect={selectClip}
        currentTime={currentTime}
        isPlaying={isPlaying}
      />
    </div>
  );
};
