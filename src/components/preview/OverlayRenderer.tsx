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
    const textStyle: React.CSSProperties = clip.textStyle
      ? {
          fontFamily: clip.textStyle.fontFamily,
          fontSize: `${clip.textStyle.fontSize}px`,
          fontWeight: clip.textStyle.fontWeight,
          color: clip.textStyle.color,
          backgroundColor: clip.textStyle.backgroundColor,
          textAlign: clip.textStyle.textAlign,
        }
      : {
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        };

    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            textStyle.textAlign === 'left'
              ? 'flex-start'
              : textStyle.textAlign === 'right'
              ? 'flex-end'
              : 'center',
        }}
      >
        <p style={{ ...textStyle, width: '100%', margin: 0 }}>{clip.content}</p>
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
