import React from 'react';
import type { Track, Clip, Asset } from '../../types';
import { useDroppable } from '@dnd-kit/core';
import type { MenuEntry } from 'strata-react';
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
  /** The clip's context menu (strata-react `ContextMenu`): right-click, the menu key or Shift+F10. */
  clipMenu?: (clipId: string) => readonly MenuEntry[];
}

export const TrackLane: React.FC<TrackLaneProps> = ({
  track,
  clips,
  assets,
  zoomLevel,
  selectedClipId,
  onClipSelect,
  onClipResize,
  onContextMenu,
  clipMenu
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
        relative h-16 border-b border-border transition-state
        ${isOver ? 'bg-card/50' : 'bg-background'}
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
          menuItems={clipMenu?.(clip.id)}
          viewMode={track.viewMode}
        />
      ))}
    </div>
  );
};
