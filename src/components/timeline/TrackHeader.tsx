import React from 'react';
import { Track } from '../../types';
import { Volume2, VolumeX, Lock, Unlock, Trash2, Edit2 } from 'lucide-react';

interface TrackHeaderProps {
  track: Track;
  onRemove: (id: string) => void;
  onToggleMute?: (id: string) => void; // Optional for now
  onToggleLock?: (id: string) => void; // Optional for now
  onUpdateVolume?: (id: string, volume: number) => void;
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  track,
  onRemove,
  onToggleMute,
  onToggleLock,
  onUpdateVolume
}) => {
  return (
    <div className="h-16 min-w-[200px] w-[200px] border-b border-gray-700 bg-gray-800 flex flex-col justify-center px-2 shrink-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex-1 truncate text-sm font-medium text-gray-200 mr-2">
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

      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={track.volume ?? 1.0}
          onChange={(e) => onUpdateVolume?.(track.id, parseFloat(e.target.value))}
          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          title={`Volume: ${Math.round((track.volume ?? 1.0) * 100)}%`}
        />
        <span className="text-[10px] text-gray-400 w-8 text-right">
          {Math.round((track.volume ?? 1.0) * 100)}%
        </span>
      </div>
    </div>
  );
};
