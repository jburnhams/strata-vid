import React from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { IconButton, Slider, Toolbar } from 'strata-react';
import { useProjectStore } from '../store/useProjectStore';
import { AudioEngine } from '../services/AudioEngine';

export const TransportControls: React.FC = () => {
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const currentTime = useProjectStore((state) => state.currentTime);
  const playbackRate = useProjectStore((state) => state.playbackRate);
  const masterVolume = useProjectStore((state) => state.masterVolume);
  const setPlaybackState = useProjectStore((state) => state.setPlaybackState);

  const handlePlay = () => {
    // Resume audio context on user interaction
    AudioEngine.getInstance().resumeContext();
    if (!isPlaying) {
      setPlaybackState({ isPlaying: true });
    }
  };

  const handlePause = () => {
    if (isPlaying) {
      setPlaybackState({ isPlaying: false });
    }
  };

  const handleStop = () => {
    setPlaybackState({ isPlaying: false, currentTime: 0 });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  return (
    <div className="h-12 bg-card border-t border-border flex items-center px-4 gap-4 select-none">
      <Toolbar label="Playback">
        <IconButton variant="ghost" icon={Square} label="Stop" onClick={handleStop} />
        <IconButton
          variant="ghost"
          icon={isPlaying ? Pause : Play}
          label={isPlaying ? 'Pause' : 'Play'}
          hint="Space"
          onClick={isPlaying ? handlePause : handlePlay}
        />
      </Toolbar>

      {/* Time Display */}
      <div className="font-mono text-foreground type-body-sm w-28 text-center bg-background/50 py-1 rounded-control tabular-nums" aria-label="Current Time">
        {formatTime(currentTime)}
      </div>

      <Slider
        aria-label="Volume"
        className="ml-4 w-40"
        min={0}
        max={100}
        unit="%"
        value={Math.round((masterVolume ?? 1.0) * 100)}
        onChange={(v) => setPlaybackState({ masterVolume: v / 100 })}
      />

      {/* Playback Rate */}
      <div className="ml-auto flex items-center gap-2 type-caption text-muted-foreground">
         <span>Rate: {playbackRate}x</span>
      </div>
    </div>
  );
};
