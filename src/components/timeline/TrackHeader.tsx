/**
 * A track's controls, drawn in its lane's header by strata-react's Timeline (issue #77). The
 * header is one control-height row beside the track's name, so the two controls used most stay on
 * it (Mute, Lock) and the rest (volume, what the clips show, delete) sit in a popover named for the
 * track.
 */
import React from 'react';
import type { Track, TrackViewMode } from '../../types';
import { VolumeX, Lock, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Button, IconButton, NumberField, Popover, PropertyRow, Toggle, ToggleGroup } from 'strata-react';

interface TrackHeaderProps {
  track: Track;
  onRemove: (id: string) => void;
  onToggleMute?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onUpdateVolume?: (id: string, volume: number) => void;
  onSetViewMode?: (id: string, mode: TrackViewMode) => void;
}

export const trackName = (track: Track) => track.label || `Track ${track.id}`;

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  track,
  onRemove,
  onToggleMute,
  onToggleLock,
  onUpdateVolume,
  onSetViewMode,
}) => {
  const name = trackName(track);
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <Toggle size="sm" iconOnly icon={VolumeX} label={`Mute ${name}`} pressed={!!track.isMuted} onChange={() => onToggleMute?.(track.id)} />
      <Toggle size="sm" iconOnly icon={Lock} label={`Lock ${name}`} pressed={!!track.isLocked} onChange={() => onToggleLock?.(track.id)} />
      <Popover
        label={`${name} settings`}
        size="sm"
        trigger={<IconButton variant="ghost" icon={SlidersHorizontal} label={`${name} settings`} />}
      >
        <div className="grid gap-3">
          <PropertyRow label="Track volume" hint="Above 100% boosts the track.">
            <NumberField
              min={0}
              max={500}
              step={1}
              unit="%"
              value={Math.round((track.volume ?? 1.0) * 100)}
              onChange={(v) => v !== null && onUpdateVolume?.(track.id, v / 100)}
            />
          </PropertyRow>
          {track.type === 'video' && (
            <ToggleGroup
              size="sm"
              label="Clips show"
              value={track.viewMode || 'frames'}
              onChange={(mode) => onSetViewMode?.(track.id, mode as TrackViewMode)}
              options={[
                { value: 'frames', label: 'Frames' },
                { value: 'waveform', label: 'Waveform' },
                { value: 'both', label: 'Both' },
              ]}
            />
          )}
          <Button variant="outline" size="sm" className="justify-self-start" onClick={() => onRemove(track.id)}>
            <Trash2 aria-hidden />
            Delete track
          </Button>
        </div>
      </Popover>
    </span>
  );
};
