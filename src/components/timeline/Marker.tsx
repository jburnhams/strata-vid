import React from 'react';
import { Marker as MarkerType } from '../../types';

interface MarkerProps {
  marker: MarkerType;
  zoomLevel: number;
  onClick?: (id: string) => void;
}

export const Marker: React.FC<MarkerProps> = ({ marker, zoomLevel, onClick }) => {
  return (
    <div
      className="absolute top-0 bottom-0 z-40 group flex flex-col items-center pointer-events-none"
      style={{ left: `${marker.time * zoomLevel}px` }}
      data-testid={`marker-${marker.id}`}
    >
      {/* Marker Head */}
      <div
        className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] pointer-events-auto cursor-pointer hover:scale-110 transition-transform relative"
        style={{ borderTopColor: marker.color }}
        title={`${marker.label} (${marker.time.toFixed(2)}s)`}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(marker.id);
        }}
      >
        {/* Label Tooltip on Hover */}
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
          {marker.label}
        </div>
      </div>
      {/* Marker Line */}
      <div
        className="w-px h-full opacity-50 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: marker.color }}
      />
    </div>
  );
};
