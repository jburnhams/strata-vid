import React from 'react';
import type { Track, TrackViewMode } from '../../types';
import { Volume2, VolumeX, Lock, Unlock, Trash2, Film, AudioWaveform, Layers } from 'lucide-react';

interface TrackHeaderProps {
  track: Track;
  onRemove: (id: string) => void;
  onToggleMute?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onUpdateVolume?: (id: string, volume: number) => void;
  onToggleViewMode?: (id: string) => void;
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  track,
  onRemove,
  onToggleMute,
  onToggleLock,
  onUpdateVolume,
  onToggleViewMode
}) => {
  const getViewModeIcon = (mode?: TrackViewMode) => {
    switch (mode) {
      case 'waveform':
        return <AudioWaveform size={14} />;
      case 'both':
        return <Layers size={14} />;
      case 'frames':
      default:
        return <Film size={14} />;
    }
  };

  const getViewModeTooltip = (mode?: TrackViewMode) => {
    switch (mode) {
      case 'waveform':
        return 'Show Waveform Only';
      case 'both':
        return 'Show Both Video and Waveform';
      case 'frames':
      default:
        return 'Show Video Frames Only';
    }
  };

  return (
    <div className="h-16 min-w-[200px] w-[200px] border-b border-border bg-card flex flex-col justify-center px-2 shrink-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex-1 truncate type-body-sm font-medium text-foreground mr-2">
          {track.label || `Track ${track.id}`}
        </div>
        <div className="flex gap-1">
          {track.type === 'video' && (
             <button
              className="p-1 hover:bg-muted rounded-control text-muted-foreground hover:text-foreground"
              onClick={() => onToggleViewMode?.(track.id)}
              title={getViewModeTooltip(track.viewMode)}
            >
              {getViewModeIcon(track.viewMode)}
            </button>
          )}
          <button
            className="p-1 hover:bg-muted rounded-control text-muted-foreground hover:text-foreground"
            onClick={() => onToggleMute?.(track.id)}
            title={track.isMuted ? "Unmute" : "Mute"}
          >
            {track.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            className="p-1 hover:bg-muted rounded-control text-muted-foreground hover:text-foreground"
            onClick={() => onToggleLock?.(track.id)}
            title={track.isLocked ? "Unlock" : "Lock"}
          >
            {track.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button
            className="p-1 hover:bg-muted rounded-control text-danger hover:text-danger"
            onClick={() => onRemove(track.id)}
            title="Delete Track"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
         <span className="type-caption text-muted-foreground">Vol:</span>
         <input
            type="number"
            min="0"
            max="500"
            step="1"
            value={Math.round((track.volume ?? 1.0) * 100)}
            onChange={(e) => onUpdateVolume?.(track.id, parseFloat(e.target.value) / 100)}
            className="w-12 bg-background border border-border rounded-control px-1 py-0.5 type-caption text-right text-foreground focus:outline-none focus:border-primary"
            title="Volume %"
          />
          <span className="type-caption text-muted-foreground">%</span>
      </div>
    </div>
  );
};
