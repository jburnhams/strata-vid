import { useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';

export const useKeyboardShortcuts = () => {
  const setPlaybackState = useProjectStore((state) => state.setPlaybackState);
  const removeClip = useProjectStore((state) => state.removeClip);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input or contentEditable
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const state = useProjectStore.getState();
      const fps = state.settings.fps || 30;
      const frameTime = 1 / fps;
      const duration = state.settings.duration;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          setPlaybackState({ isPlaying: !state.isPlaying });
          break;
        case 'KeyJ':
           // Rewind 1 second
           setPlaybackState({ currentTime: Math.max(0, state.currentTime - 1) });
           break;
        case 'KeyL':
           // Forward 1 second
           setPlaybackState({ currentTime: Math.min(duration, state.currentTime + 1) });
           break;
        case 'ArrowLeft':
           e.preventDefault();
           // Frame stepping usually pauses
           setPlaybackState({ isPlaying: false, currentTime: Math.max(0, state.currentTime - frameTime) });
           break;
        case 'ArrowRight':
           e.preventDefault();
           setPlaybackState({ isPlaying: false, currentTime: Math.min(duration, state.currentTime + frameTime) });
           break;
        case 'Home':
            e.preventDefault();
            setPlaybackState({ currentTime: 0 });
            break;
        case 'End':
            e.preventDefault();
            setPlaybackState({ currentTime: duration });
            break;
        case 'Delete':
        case 'Backspace':
            // Only remove if a clip is selected and we are not editing text
            if (state.selectedClipId) {
                e.preventDefault();
                removeClip(state.selectedClipId);
            }
            break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setPlaybackState, removeClip]);
};
