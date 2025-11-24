import React, { useEffect, useRef } from 'react';
import { Clip, Asset } from '../../types';

interface VideoPlayerProps {
  clip: Clip;
  asset: Asset;
  currentTime: number; // Global time
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  clip,
  asset,
  currentTime,
  isPlaying,
  playbackRate,
  volume,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Calculate where the video should be in its own timeline
  const expectedVideoTime = Math.max(0, currentTime - clip.start + clip.offset);

  // Transition Logic
  let effectiveOpacity = clip.properties.opacity;
  let effectiveVolume = volume;
  let clipPath: string | undefined;

  if (clip.transitionIn) {
    const t = currentTime - clip.start;
    if (t >= 0 && t < clip.transitionIn.duration) {
      const progress = t / clip.transitionIn.duration;
      if (clip.transitionIn.type === 'crossfade' || clip.transitionIn.type === 'fade') {
        effectiveOpacity *= progress;
        effectiveVolume *= progress;
      } else if (clip.transitionIn.type === 'wipe') {
        const p = progress * 100;
        clipPath = `polygon(0 0, ${p}% 0, ${p}% 100%, 0 100%)`;
      }
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Sync Playback Rate
    if (Math.abs(video.playbackRate - playbackRate) > 0.01) {
      video.playbackRate = playbackRate;
    }

    // Sync Volume
    if (Math.abs(video.volume - effectiveVolume) > 0.01) {
       video.volume = Math.max(0, Math.min(1, effectiveVolume));
    }

    // Sync Time
    // If paused, we want precise seeking (scrubbing)
    // If playing, we tolerate some drift (0.1s) to avoid stutter
    const drift = Math.abs(video.currentTime - expectedVideoTime);
    const isSeeking = !isPlaying || drift > 0.1;

    if (isSeeking) {
         if (Number.isFinite(expectedVideoTime)) {
             // In Chrome, setting currentTime can be async if not loaded.
             // But we assume metadata is loaded or it will catch up.
             video.currentTime = expectedVideoTime;
         }
    }

    // Sync Play/Pause
    if (isPlaying && video.paused) {
        // Only play if we are not at the end of the video file (unless looping, but clips don't loop by default usually)
        if (video.duration && expectedVideoTime < video.duration) {
             video.play().catch(e => console.warn("Auto-play prevented:", e));
        }
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [currentTime, isPlaying, playbackRate, expectedVideoTime, asset.src, effectiveVolume]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${clip.properties.x}%`,
    top: `${clip.properties.y}%`,
    width: `${clip.properties.width}%`,
    height: `${clip.properties.height}%`,
    transform: `rotate(${clip.properties.rotation}deg)`,
    opacity: effectiveOpacity,
    zIndex: clip.properties.zIndex,
    objectFit: 'cover',
    pointerEvents: 'none',
    clipPath,
  };

  return (
    <video
      ref={videoRef}
      src={asset.src}
      style={style}
      playsInline
    />
  );
};
