import React from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';

interface VolumeControlProps {
  volume: number;
  onChange: (volume: number) => void;
  className?: string;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  onChange,
  className = '',
}) => {
  const Icon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className={`flex items-center gap-2 group ${className}`}>
       <button
         onClick={() => onChange(volume === 0 ? 1 : 0)}
         className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
         title={volume === 0 ? "Unmute" : "Mute"}
       >
         <Icon size={16} />
       </button>
       <input
         type="range"
         min={0}
         max={1}
         step={0.01}
         value={volume}
         onChange={(e) => onChange(parseFloat(e.target.value))}
         className="h-1 w-20 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
       />
       <span className="text-xs text-gray-400 w-8 text-right font-mono">
         {Math.round(volume * 100)}%
       </span>
    </div>
  );
};
