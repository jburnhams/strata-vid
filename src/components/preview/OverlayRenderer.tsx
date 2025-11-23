import React from 'react';
import { Clip, Asset } from '../../types';
import { MapPanel } from '../MapPanel';

interface OverlayRendererProps {
  clip: Clip;
  asset?: Asset;
  currentTime: number;
}

export const OverlayRenderer: React.FC<OverlayRendererProps> = ({ clip, asset, currentTime }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${clip.properties.x}%`,
    top: `${clip.properties.y}%`,
    width: `${clip.properties.width}%`,
    height: `${clip.properties.height}%`,
    transform: `rotate(${clip.properties.rotation}deg)`,
    opacity: clip.properties.opacity,
    zIndex: clip.properties.zIndex,
    overflow: 'hidden',
    pointerEvents: 'none',
  };

  if (clip.type === 'text') {
    return (
      <div style={style} className="flex items-center justify-center">
        <p className="text-white text-xl font-bold drop-shadow-md">{clip.content}</p>
      </div>
    );
  }

  if (clip.type === 'image' && asset) {
     return (
       <div style={style}>
         <img src={asset.src} alt={clip.id} className="w-full h-full object-contain" />
       </div>
     );
  }

  if (clip.type === 'map' && asset && asset.geoJson) {
      return (
          <div style={style}>
              <MapPanel
                className="w-full h-full"
                geoJson={asset.geoJson}
              />
          </div>
      );
  }

  return null;
};
