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
    <div className="h-16 min-w-[240px] w-[240px] border-b border-border bg-card flex flex-col justify-center gap-0.5 px-2 shrink-0">
      <div className="truncate type-body-sm font-medium text-foreground">
        {track.label || `Track ${track.id}`}
      </div>
      <div className="flex items-center gap-2">
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
        <NumberField
          aria-label="Track volume"
          className="ml-auto w-20"
          min={0}
          max={500}
          step={1}
          unit="%"
          value={Math.round((track.volume ?? 1.0) * 100)}
          onChange={(v) => v !== null && onUpdateVolume?.(track.id, v / 100)}
        />
      </div>
    </div>
  );
};
