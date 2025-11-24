import React, { useEffect, useRef } from 'react';
import { Clip, Asset } from '../../types';

interface AudioPlayerProps {
  clip: Clip;
  asset: Asset;
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number; // 0-1, combined clip and track volume
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  clip,
  asset,
  currentTime,
  isPlaying,
  playbackRate,
  volume,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Calculate local time
  const expectedTime = Math.max(0, currentTime - clip.start + clip.offset);

  // Calculate effective volume including transitions
  let effectiveVolume = volume;

  if (clip.transitionIn) {
    const t = currentTime - clip.start;
    if (t >= 0 && t < clip.transitionIn.duration) {
      const progress = t / clip.transitionIn.duration;
      if (clip.transitionIn.type === 'crossfade' || clip.transitionIn.type === 'fade') {
         effectiveVolume *= progress;
      }
      // Wipe transition doesn't really apply to audio unless we want to fade?
      // Typically wipe is visual. We keep audio full or fade?
      // Let's assume crossfade behavior for audio on any transition type for smoothness, or just no effect for wipe.
      // Standard is crossfade/fade affects audio. Wipe usually doesn't affect audio unless specified.
    }
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Sync Playback Rate
    if (Math.abs(audio.playbackRate - playbackRate) > 0.01) {
      audio.playbackRate = playbackRate;
    }

    // Sync Volume
    // Check constraints
    const targetVolume = Math.max(0, Math.min(1, effectiveVolume));
    if (Math.abs(audio.volume - targetVolume) > 0.01) {
        audio.volume = targetVolume;
    }

    // Sync Time
    const drift = Math.abs(audio.currentTime - expectedTime);
    const isSeeking = !isPlaying || drift > 0.1;

    if (isSeeking) {
         if (Number.isFinite(expectedTime)) {
             audio.currentTime = expectedTime;
         }
    }

    // Sync Play/Pause
    if (isPlaying && audio.paused) {
        if (audio.duration && expectedTime < audio.duration) {
             audio.play().catch(e => console.warn("Audio auto-play prevented:", e));
        }
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [currentTime, isPlaying, playbackRate, expectedTime, asset.src, effectiveVolume]);

  return (
    <audio
      ref={audioRef}
      src={asset.src}
      playsInline
      data-testid={`audio-player-${clip.id}`}
    />
  );
};
