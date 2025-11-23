import React, { useEffect, useRef } from 'react';
import { Clip, Asset } from '../../types';

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

  // Calculate where the video should be in its own timeline
  const expectedVideoTime = Math.max(0, currentTime - clip.start + clip.offset);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Sync Playback Rate
    if (Math.abs(video.playbackRate - playbackRate) > 0.01) {
      video.playbackRate = playbackRate;
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
  }, [currentTime, isPlaying, playbackRate, expectedVideoTime, asset.src]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${clip.properties.x}%`,
    top: `${clip.properties.y}%`,
    width: `${clip.properties.width}%`,
    height: `${clip.properties.height}%`,
    transform: `rotate(${clip.properties.rotation}deg)`,
    opacity: clip.properties.opacity,
    zIndex: clip.properties.zIndex,
    objectFit: 'cover',
    pointerEvents: 'none',
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
