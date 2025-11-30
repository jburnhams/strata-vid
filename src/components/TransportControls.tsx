import React from 'react';
import { Play, Pause, Square, SkipBack, SkipForward } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { Tooltip } from './Tooltip';
import { AudioEngine } from '../services/AudioEngine';

export const TransportControls: React.FC = () => {
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const currentTime = useProjectStore((state) => state.currentTime);
  const playbackRate = useProjectStore((state) => state.playbackRate);
  const masterVolume = useProjectStore((state) => state.masterVolume);
  const setPlaybackState = useProjectStore((state) => state.setPlaybackState);

  const handlePlay = () => {
    // Resume audio context on user interaction
    AudioEngine.getInstance().resumeContext();
    if (!isPlaying) {
      setPlaybackState({ isPlaying: true });
    }
  };

  const handlePause = () => {
    if (isPlaying) {
      setPlaybackState({ isPlaying: false });
    }
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
        <Tooltip content="Stop (Home)" position="top">
            <button
            onClick={handleStop}
            className="p-1.5 hover:bg-neutral-700 rounded text-neutral-300 hover:text-white transition-colors"
            aria-label="Stop"
            >
            <Square size={16} fill="currentColor" />
            </button>
        </Tooltip>

        <Tooltip content={isPlaying ? "Pause (Space)" : "Play (Space)"} position="top">
            <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="p-1.5 hover:bg-neutral-700 rounded text-neutral-300 hover:text-white transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
            >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
        </Tooltip>
      </div>

      {/* Time Display */}
      <div className="font-mono text-neutral-300 text-sm w-28 text-center bg-neutral-900/50 py-1 rounded" aria-label="Current Time">
        {formatTime(currentTime)}
      </div>

      <div className="flex items-center gap-2 ml-4">
        <span className="text-xs text-neutral-400">Vol:</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={masterVolume ?? 1.0}
          onChange={(e) => setPlaybackState({ masterVolume: parseFloat(e.target.value) })}
          className="w-24 h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          title={`Volume: ${Math.round((masterVolume ?? 1.0) * 100)}%`}
        />
      </div>

      {/* Playback Rate */}
      <div className="ml-auto flex items-center gap-2 text-xs text-neutral-400">
         <span>Rate: {playbackRate}x</span>
      </div>
    </div>
  );
};
