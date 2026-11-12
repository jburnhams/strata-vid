/**
 * The player's controls, from strata-react's media transport (issue #78): the buttons, the time,
 * a seek bar, the master volume and the playback speed. They take the store's playback state and
 * report requests, so the store stays the one player; the keys are the editor's commands
 * (`useEditorCommands`), not a second binding here.
 */
import React from 'react';
import { RateChoice, SeekBar, TimeReadout, Transport, VolumeControl } from 'strata-react';
import { useProjectStore } from '../store/useProjectStore';
import { AudioEngine } from '../services/AudioEngine';

export const TransportControls: React.FC = () => {
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const currentTime = useProjectStore((state) => state.currentTime);
  const playbackRate = useProjectStore((state) => state.playbackRate);
  const masterVolume = useProjectStore((state) => state.masterVolume);
  const duration = useProjectStore((state) => state.settings.duration);
  const fps = useProjectStore((state) => state.settings.fps) || 30;
  const setPlaybackState = useProjectStore((state) => state.setPlaybackState);

  const seek = (time: number) => setPlaybackState({ currentTime: Math.min(duration, Math.max(0, time)) });

  const playPause = () => {
    // Audio can only start from a person's action
    if (!isPlaying) AudioEngine.getInstance().resumeContext();
    setPlaybackState({ isPlaying: !isPlaying });
  };

  return (
    <div className="bg-card border-t border-border flex items-center px-4 py-1 gap-4 select-none">
      <Transport
        playing={isPlaying}
        onPlayPause={playPause}
        onStop={() => setPlaybackState({ isPlaying: false, currentTime: 0 })}
        onStepBack={() => setPlaybackState({ isPlaying: false, currentTime: Math.max(0, currentTime - 1 / fps) })}
        onStepForward={() => setPlaybackState({ isPlaying: false, currentTime: Math.min(duration, currentTime + 1 / fps) })}
      >
        <TimeReadout time={currentTime} duration={duration} precision="ms" fps={fps} />
      </Transport>
      <SeekBar
        className="flex-1 min-w-0"
        label="Playhead"
        time={currentTime}
        duration={Math.max(duration, 0.001)}
        precision="ms"
        fps={fps}
        step={1}
        onSeek={seek}
        disabled={duration <= 0}
      />
      <VolumeControl
        className="w-40"
        volume={Math.round((masterVolume ?? 1.0) * 100)}
        onVolumeChange={(v) => setPlaybackState({ masterVolume: v / 100 })}
      />
      <RateChoice rate={playbackRate} onRateChange={(rate) => setPlaybackState({ playbackRate: rate })} />
    </div>
  );
};
