import React, { useEffect, useRef } from 'react';
import { Clip, Asset } from '../../types';
import { AudioEngine } from '../../services/AudioEngine';

interface AudioPlayerProps {
  clip: Clip;
  asset: Asset;
  currentTime: number; // Global time
  isPlaying: boolean;
  playbackRate: number;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  clip,
  asset,
  currentTime,
  isPlaying,
  playbackRate,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Calculate where the audio should be in its own timeline
  const clipRate = clip.playbackRate || 1;
  const expectedAudioTime = Math.max(0, (currentTime - clip.start) * clipRate + clip.offset);

  // Audio Engine Registration
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const engine = AudioEngine.getInstance();
    engine.registerClip(clip.id, clip.trackId, audio, clip.volume ?? 1.0);

    return () => {
      engine.unregisterClip(clip.id);
    };
  }, [clip.id, clip.trackId]);

  // Audio Volume Update
  useEffect(() => {
    const engine = AudioEngine.getInstance();
    engine.updateClipVolume(clip.id, clip.volume ?? 1.0);
  }, [clip.id, clip.volume]);

  // Play/Pause Effect
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      if (audio.paused) {
        audio.play().catch(e => console.warn("Audio auto-play prevented:", e));
      }
    } else {
      if (!audio.paused) {
        audio.pause();
      }
    }
  }, [isPlaying]);

  // Sync Effect
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Sync Playback Rate
    const effectiveRate = playbackRate * clipRate;
    if (Math.abs(audio.playbackRate - effectiveRate) > 0.01) {
      audio.playbackRate = effectiveRate;
    }

    // Sync Time
    const drift = Math.abs(audio.currentTime - expectedAudioTime);
    const isSeeking = !isPlaying || drift > 0.1;

    if (isSeeking && Number.isFinite(expectedAudioTime)) {
        audio.currentTime = expectedAudioTime;
    }
  }, [currentTime, isPlaying, playbackRate, clipRate, clip.start, clip.offset, asset.src]);

  return (
    <audio
      ref={audioRef}
      src={asset.src}
      playsInline
      crossOrigin="anonymous"
      style={{ display: 'none' }}
    />
  );
};
