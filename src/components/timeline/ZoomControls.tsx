import React from 'react';
import { Minus, Plus, Maximize } from 'lucide-react';
import { IconButton, Slider, Toolbar, ToolbarSeparator } from 'strata-react';

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
    <Toolbar label="Timeline zoom" className="flex items-center gap-1 type-caption text-muted-foreground">
      <IconButton variant="ghost" icon={Minus} label="Zoom out" onClick={handleDecrease} />
      <Slider
        aria-label="Zoom"
        className="w-40"
        min={min}
        max={max}
        step={1}
        unit="px/s"
        value={Math.round(zoomLevel)}
        onChange={setZoomLevel}
      />
      <IconButton variant="ghost" icon={Plus} label="Zoom in" onClick={handleIncrease} />
      {onZoomToFit && (
        <>
          <ToolbarSeparator />
          <IconButton variant="ghost" icon={Maximize} label="Zoom to fit" onClick={onZoomToFit} />
        </>
      )}
    </Toolbar>
  );
};
