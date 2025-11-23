import React from 'react';

interface SafeAreaGuidesProps {
  showSafeAreas?: boolean;
  showGrid?: boolean;
}

export const SafeAreaGuides: React.FC<SafeAreaGuidesProps> = ({
  showSafeAreas = false,
  showGrid = false,
}) => {
  if (!showSafeAreas && !showGrid) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50" data-testid="safe-area-guides">
      {showSafeAreas && (
        <>
          {/* Action Safe (90%) */}
          <div className="absolute top-[5%] left-[5%] right-[5%] bottom-[5%] border border-blue-400/50" data-testid="guide-action-safe" />
          {/* Title Safe (80%) */}
          <div className="absolute top-[10%] left-[10%] right-[10%] bottom-[10%] border border-green-400/50" data-testid="guide-title-safe" />

          {/* Crosshair */}
          <div className="absolute top-1/2 left-0 w-full h-px bg-white/30" data-testid="guide-crosshair-h" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/30" data-testid="guide-crosshair-v" />
        </>
      )}

      {showGrid && (
        <>
          {/* Verticals */}
          <div className="absolute top-0 bottom-0 left-[33.33%] w-px bg-white/20" data-testid="guide-grid-v1" />
          <div className="absolute top-0 bottom-0 left-[66.66%] w-px bg-white/20" data-testid="guide-grid-v2" />
          {/* Horizontals */}
          <div className="absolute left-0 right-0 top-[33.33%] h-px bg-white/20" data-testid="guide-grid-h1" />
          <div className="absolute left-0 right-0 top-[66.66%] h-px bg-white/20" data-testid="guide-grid-h2" />
        </>
      )}
    </div>
  );
};
