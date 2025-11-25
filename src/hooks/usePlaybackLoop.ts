import { useEffect, useRef } from 'react';
import { useProjectStore } from '../store/useProjectStore';

export const usePlaybackLoop = () => {
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const playbackRate = useProjectStore((state) => state.playbackRate);
  const setPlaybackState = useProjectStore((state) => state.setPlaybackState);
  const addToast = useProjectStore((state) => state.addToast);

  const lastFrameTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lagCounterRef = useRef(0);

  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = performance.now();
      lagCounterRef.current = 0;

      const loop = () => {
        // Use performance.now() directly for better consistency and testability
        const now = performance.now();

        if (lastFrameTimeRef.current !== null) {
          const delta = (now - lastFrameTimeRef.current) / 1000; // convert to seconds

          // J6: Performance monitoring
          // Detect if frame time > 50ms (less than 20fps)
          if (delta > 0.05) {
             lagCounterRef.current++;
             // If we have 60 consecutive laggy frames (approx 3 seconds of bad performance)
             if (lagCounterRef.current === 60) {
                 addToast('Low performance detected. Playback may be choppy.', 'warning');
                 // Reset and set negative to create a cooldown period
                 lagCounterRef.current = -300;
             }
          } else if (delta > 0.001) {
             // Decay the lag counter so occasional spikes don't trigger warning
             // Ignore extremely small deltas (e.g. double firing in same tick) to prevent false decays
             lagCounterRef.current = Math.max(0, lagCounterRef.current - 1);
          }

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
  }, [isPlaying, playbackRate, setPlaybackState, addToast]);
};
