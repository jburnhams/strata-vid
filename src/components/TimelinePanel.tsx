import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { TimelineContainer } from './timeline/TimelineContainer';

export const TimelinePanel: React.FC = () => {
  // Connect to store
  const tracks = useProjectStore((state) => state.tracks);
  const clips = useProjectStore((state) => state.clips);
  const trackOrder = useProjectStore((state) => state.trackOrder);
  const moveClip = useProjectStore((state) => state.moveClip);
  const resizeClip = useProjectStore((state) => state.resizeClip);
  const removeTrack = useProjectStore((state) => state.removeTrack);

  // Local state for UI
  const [zoomLevel, setZoomLevel] = useState(10); // pixels per second
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  return (
    <div className="h-full w-full bg-gray-900 text-white overflow-hidden">
      <TimelineContainer
        tracks={tracks}
        clips={clips}
        trackOrder={trackOrder}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        onMoveClip={moveClip}
        onResizeClip={resizeClip}
        onRemoveTrack={removeTrack}
        selectedClipId={selectedClipId}
        onClipSelect={setSelectedClipId}
      />
    </div>
  );
};
