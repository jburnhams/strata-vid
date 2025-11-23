import React from 'react';
import { Track } from '../../types';
import { Volume2, VolumeX, Lock, Unlock, Trash2, Edit2 } from 'lucide-react';

interface TrackHeaderProps {
  track: Track;
  onRemove: (id: string) => void;
  onToggleMute?: (id: string) => void; // Optional for now
  onToggleLock?: (id: string) => void; // Optional for now
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  track,
  onRemove,
  onToggleMute,
  onToggleLock
}) => {
  return (
    <div className="h-16 min-w-[200px] w-[200px] border-b border-gray-700 bg-gray-800 flex items-center px-2 gap-2 shrink-0">
      <div className="flex-1 truncate text-sm font-medium text-gray-200">
        {track.label || `Track ${track.id}`}
      </div>

      <div className="flex gap-1">
        <button
          className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
          onClick={() => onToggleMute?.(track.id)}
          title={track.isMuted ? "Unmute" : "Mute"}
        >
          {track.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        <button
          className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
          onClick={() => onToggleLock?.(track.id)}
          title={track.isLocked ? "Unlock" : "Lock"}
        >
          {track.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>

        <button
          className="p-1 hover:bg-gray-700 rounded text-red-400 hover:text-red-200"
          onClick={() => onRemove(track.id)}
          title="Delete Track"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
