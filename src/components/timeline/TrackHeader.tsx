import React from 'react';
import type { Track, TrackViewMode } from '../../types';
import { VolumeX, Lock, Trash2, Film, AudioWaveform, Layers } from 'lucide-react';
import { IconButton, NumberField, Toggle, Toolbar } from 'strata-react';

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
  const viewModeIcon = (mode?: TrackViewMode) =>
    mode === 'waveform' ? AudioWaveform : mode === 'both' ? Layers : Film;

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
        <Toolbar label={`${track.label || `Track ${track.id}`} controls`} className="flex gap-0.5">
          {track.type === 'video' && (
            <IconButton
              variant="ghost"
              icon={viewModeIcon(track.viewMode)}
              label={getViewModeTooltip(track.viewMode)}
              onPress={() => onToggleViewMode?.(track.id)}
            />
          )}
          <Toggle size="sm" iconOnly icon={VolumeX} label="Mute" pressed={!!track.isMuted} onChange={() => onToggleMute?.(track.id)} />
          <Toggle size="sm" iconOnly icon={Lock} label="Lock" pressed={!!track.isLocked} onChange={() => onToggleLock?.(track.id)} />
          <IconButton variant="ghost" icon={Trash2} label="Delete track" onPress={() => onRemove(track.id)} />
        </Toolbar>
      </div>

      <NumberField
        aria-label="Track volume"
        className="w-28"
        min={0}
        max={500}
        step={1}
        unit="%"
        value={Math.round((track.volume ?? 1.0) * 100)}
        onChange={(v) => v !== null && onUpdateVolume?.(track.id, v / 100)}
      />
    </div>
  );
};
