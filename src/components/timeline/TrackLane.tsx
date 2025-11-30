import React from 'react';
import { Track, Clip, Asset } from '../../types';
import { useDroppable } from '@dnd-kit/core';
import { ClipItem } from './ClipItem';

interface TrackLaneProps {
  track: Track;
  clips: Clip[];
  assets: Record<string, Asset>;
  zoomLevel: number;
  selectedClipId?: string | null;
  onClipSelect?: (id: string) => void;
  onClipResize?: (id: string, newStart: number, newDuration: number, newOffset: number) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
}

export const TrackLane: React.FC<TrackLaneProps> = ({
  track,
  clips,
  assets,
  zoomLevel,
  selectedClipId,
  onClipSelect,
  onClipResize,
  onContextMenu
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: track.id,
    data: {
      type: 'Track',
      track,
    },
  });

  return (
    <div
      ref={setNodeRef}
      data-testid="track-lane"
      className={`
        relative h-16 border-b border-gray-700 transition-colors
        ${isOver ? 'bg-gray-800/50' : 'bg-gray-900'}
      `}
      style={{
        // Ensure container is wide enough for all clips
        minWidth: '100%',
      }}
    >
      {clips.map((clip) => (
        <ClipItem
          key={clip.id}
          clip={clip}
          asset={assets[clip.assetId]}
          zoomLevel={zoomLevel}
          isSelected={selectedClipId === clip.id}
          onSelect={onClipSelect}
          onResize={onClipResize}
          onContextMenu={onContextMenu}
          viewMode={track.viewMode}
        />
      ))}
    </div>
  );
};
