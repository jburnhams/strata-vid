import React from 'react';
import { Play, Pause, Square, Rewind, FastForward } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';

export const TransportControls: React.FC = () => {
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const currentTime = useProjectStore((state) => state.currentTime);
  const playbackRate = useProjectStore((state) => state.playbackRate);
  const setPlaybackState = useProjectStore((state) => state.setPlaybackState);

  const togglePlay = () => {
    setPlaybackState({ isPlaying: !isPlaying });
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
    <div className="h-12 bg-neutral-800 border-t border-neutral-700 flex items-center px-4 gap-4 select-none">
      <div className="flex items-center gap-2">
        <button
          onClick={handleStop}
          className="p-1.5 hover:bg-neutral-700 rounded text-neutral-300 hover:text-white transition-colors"
          title="Stop (Home)"
        >
          <Square size={16} fill="currentColor" />
        </button>

        <button
          onClick={togglePlay}
          className="p-1.5 hover:bg-neutral-700 rounded text-neutral-300 hover:text-white transition-colors"
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
      </div>

      {/* Time Display */}
      <div className="font-mono text-neutral-300 text-sm w-28 text-center bg-neutral-900/50 py-1 rounded">
        {formatTime(currentTime)}
      </div>

      {/* Playback Rate */}
      <div className="ml-auto flex items-center gap-2 text-xs text-neutral-400">
         <span>Rate: {playbackRate}x</span>
      </div>
    </div>
  );
};
