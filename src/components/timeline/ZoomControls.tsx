import React from 'react';
import { Minus, Plus, ZoomIn, Maximize } from 'lucide-react';

interface ZoomControlsProps {
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  min?: number;
  max?: number;
  onZoomToFit?: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  setZoomLevel,
  min = 1,
  max = 200, // Maximum reasonable pixel-per-second
  onZoomToFit,
}) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setZoomLevel(val);
  };

  const handleDecrease = () => {
    // Decrease by 10% or at least 1 unit
    const delta = Math.max(1, zoomLevel * 0.1);
    setZoomLevel(Math.max(min, zoomLevel - delta));
  };

  const handleIncrease = () => {
    // Increase by 10% or at least 1 unit
    const delta = Math.max(1, zoomLevel * 0.1);
    setZoomLevel(Math.min(max, zoomLevel + delta));
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 rounded-lg px-2 py-1 border border-gray-700">
      <ZoomIn size={14} className="text-gray-500" />

      <button
        onClick={handleDecrease}
        className="p-1 hover:text-white hover:bg-gray-700 rounded transition-colors"
        title="Zoom Out"
      >
        <Minus size={12} />
      </button>

      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={zoomLevel}
        onChange={handleSliderChange}
        className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />

      <button
        onClick={handleIncrease}
        className="p-1 hover:text-white hover:bg-gray-700 rounded transition-colors"
        title="Zoom In"
      >
        <Plus size={12} />
      </button>

      <span className="w-12 text-right tabular-nums text-gray-500">
        {Math.round(zoomLevel)}px
      </span>

      {onZoomToFit && (
        <button
          onClick={onZoomToFit}
          className="p-1 hover:text-white hover:bg-gray-700 rounded transition-colors ml-1 border-l border-gray-700 pl-2"
          title="Zoom to Fit"
        >
          <Maximize size={12} />
        </button>
      )}
    </div>
  );
};
