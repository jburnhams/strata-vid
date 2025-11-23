import { useEffect, useRef } from 'react';
import { useProjectStore } from '../store/useProjectStore';

export const usePlaybackLoop = () => {
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const playbackRate = useProjectStore((state) => state.playbackRate);
  const setPlaybackState = useProjectStore((state) => state.setPlaybackState);

  const lastFrameTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = performance.now();

      const loop = (now: number) => {
        if (lastFrameTimeRef.current !== null) {
          const delta = (now - lastFrameTimeRef.current) / 1000; // convert to seconds
          const state = useProjectStore.getState();

          let newTime = state.currentTime + (delta * playbackRate);
          const duration = state.settings.duration;

          if (newTime >= duration) {
            newTime = duration;
            setPlaybackState({ isPlaying: false, currentTime: newTime });
            lastFrameTimeRef.current = null;
            return; // Stop loop
          } else {
             setPlaybackState({
               currentTime: newTime,
             });
          }
        }
        lastFrameTimeRef.current = now;
        animationFrameRef.current = requestAnimationFrame(loop);
      };

      animationFrameRef.current = requestAnimationFrame(loop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastFrameTimeRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackRate, setPlaybackState]);
};
