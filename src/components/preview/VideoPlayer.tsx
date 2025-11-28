import React, { useEffect, useRef } from 'react';
import { Clip, Asset, OverlayProperties } from '../../types';
import { interpolateValue } from '../../utils/animationUtils';

interface VideoPlayerProps {
  clip: Clip;
  asset: Asset;
  currentTime: number; // Global time
  isPlaying: boolean;
  playbackRate: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  clip,
  asset,
  currentTime,
  isPlaying,
  playbackRate,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastIsPlayingRef = useRef<boolean>(isPlaying);

  // Calculate where the video should be in its own timeline
  const clipRate = clip.playbackRate || 1;
  const expectedVideoTime = Math.max(0, (currentTime - clip.start) * clipRate + clip.offset);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Sync Playback Rate
    const effectiveRate = playbackRate * clipRate;
    if (Math.abs(video.playbackRate - effectiveRate) > 0.01) {
      video.playbackRate = effectiveRate;
    }

    // Sync Time
    // If paused, we want precise seeking (scrubbing)
    // If playing, we tolerate some drift (0.1s) to avoid stutter
    const drift = Math.abs(video.currentTime - expectedVideoTime);
    const isSeeking = !isPlaying || drift > 0.1;

    if (isSeeking && Number.isFinite(expectedVideoTime)) {
        // In Chrome, setting currentTime can be async if not loaded.
        // But we assume metadata is loaded or it will catch up.
        video.currentTime = expectedVideoTime;
    }

    // Sync Play/Pause - Only when isPlaying state actually changes
    const isPlayingChanged = isPlaying !== lastIsPlayingRef.current;
    
    console.log('VideoPlayer effect:', {
      isPlaying,
      lastIsPlaying: lastIsPlayingRef.current,
      isPlayingChanged,
      videoPaused: video.paused,
      currentTime,
      expectedVideoTime
    });

    if (isPlayingChanged) {
      lastIsPlayingRef.current = isPlaying;

      if (isPlaying && video.paused) {
        // Play the video. The browser will handle stopping at the end automatically.
        // Note: video.duration may be NaN if metadata hasn't loaded yet, so we don't check it here.
        video.play().catch(e => console.warn("Auto-play prevented:", e));
      } else if (!isPlaying && !video.paused) {
        video.pause();
      }
    }
  }, [currentTime, isPlaying, playbackRate, clipRate, clip.start, clip.offset, asset.src]);

  // Helper to get animated value
  const getValue = (prop: keyof OverlayProperties, defaultValue: any) => {
      if (typeof defaultValue === 'number' && clip.keyframes && clip.keyframes[prop]) {
          return interpolateValue(clip.keyframes[prop], currentTime - clip.start, defaultValue);
      }
      return defaultValue;
  };

  const x = getValue('x', clip.properties.x);
  const y = getValue('y', clip.properties.y);
  const width = getValue('width', clip.properties.width);
  const height = getValue('height', clip.properties.height);
  const rotation = getValue('rotation', clip.properties.rotation);
  const opacity = getValue('opacity', clip.properties.opacity);

  // Transition Logic
  let effectiveOpacity = opacity;
  let clipPath: string | undefined;

  if (clip.transitionIn) {
    const t = currentTime - clip.start;
    if (t >= 0 && t < clip.transitionIn.duration) {
      const progress = t / clip.transitionIn.duration;
      if (clip.transitionIn.type === 'crossfade' || clip.transitionIn.type === 'fade') {
        effectiveOpacity *= progress;
      } else if (clip.transitionIn.type === 'wipe') {
        const p = progress * 100;
        clipPath = `polygon(0 0, ${p}% 0, ${p}% 100%, 0 100%)`;
      }
    }
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: `${width}%`,
    height: `${height}%`,
    transform: `rotate(${rotation}deg)`,
    opacity: effectiveOpacity,
    zIndex: clip.properties.zIndex,
    objectFit: 'cover',
    pointerEvents: 'none',
    clipPath,
    filter: clip.properties.filter,
  };

  return (
    <video
      ref={videoRef}
      src={asset.src}
      style={style}
      muted
      playsInline
    />
  );
};
