import React, { useEffect, useRef } from 'react';
import { Asset } from '../types';
import { MapPanel } from './MapPanel';

interface PreviewPanelProps {
  activeAsset: Asset | null;
  overlayAsset?: Asset;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ activeAsset, overlayAsset }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && activeAsset && activeAsset.type === 'video') {
      videoRef.current.src = activeAsset.src;
    }
  }, [activeAsset]);

  if (!activeAsset) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
        <div className="text-center text-gray-500">
          Select a file to preview
        </div>
      </div>
    );
  }

  if (activeAsset.type === 'gpx') {
    return (
      <div className="relative w-full h-full bg-neutral-900 flex items-center justify-center overflow-hidden">
        <MapPanel className="w-full h-full" zoom={13} geoJson={activeAsset.geoJson} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {activeAsset.type === 'video' ? (
        <div className="relative w-full h-full flex justify-center items-center">
          <video
            ref={videoRef}
            controls
            className="max-w-full max-h-full"
          />
          {/* Overlay Map - Positioned absolute (HUD style) */}
          <div className="absolute top-4 right-4 w-64 h-48 border border-white/20 shadow-lg bg-black/50 backdrop-blur-sm z-10 rounded-lg overflow-hidden">
             <MapPanel
                className="w-full h-full"
                zoom={13}
                geoJson={overlayAsset?.geoJson}
             />
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500">
          Preview not available for {activeAsset.type}
        </div>
      )}
    </div>
  );
};
