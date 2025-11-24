import React from 'react';
import { Clip, Asset } from '../../types';
import { MapPanel, MapTrackData } from '../MapPanel';

interface OverlayRendererProps {
  clip: Clip;
  asset?: Asset;
  currentTime: number;
  allAssets?: Record<string, Asset>;
}

export const OverlayRenderer: React.FC<OverlayRendererProps> = ({ clip, asset, currentTime, allAssets }) => {
  // Transition Logic
  let effectiveOpacity = clip.properties.opacity;
  let clipPath: string | undefined;

  if (clip.transitionIn) {
    const t = currentTime - clip.start;
    if (t >= 0 && t < clip.transitionIn.duration) {
      const progress = t / clip.transitionIn.duration;
      if (clip.transitionIn.type === 'crossfade' || clip.transitionIn.type === 'fade') {
        effectiveOpacity *= progress;
      } else if (clip.transitionIn.type === 'wipe') {
        const p = progress * 100;
        clipPath = `polygon(0 0, ${p}% 0, ${p}% 100%, 0 100%)`;
      }
    }
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${clip.properties.x}%`,
    top: `${clip.properties.y}%`,
    width: `${clip.properties.width}%`,
    height: `${clip.properties.height}%`,
    transform: `rotate(${clip.properties.rotation}deg)`,
    opacity: effectiveOpacity,
    zIndex: clip.properties.zIndex,
    overflow: 'hidden',
    pointerEvents: 'none',
    clipPath,
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
      const tracks: MapTrackData[] = [];

      // Primary track
      tracks.push({
          geoJson: asset.geoJson,
          gpxPoints: asset.gpxPoints,
          syncOffset: clip.syncOffset,
          trackStyle: clip.properties.trackStyle,
          markerStyle: clip.properties.markerStyle
      });

      // Extra tracks
      if (clip.extraTrackAssets && allAssets) {
          clip.extraTrackAssets.forEach(extra => {
              const extraAsset = allAssets[extra.assetId];
              if (extraAsset && extraAsset.geoJson) {
                  tracks.push({
                      geoJson: extraAsset.geoJson,
                      gpxPoints: extraAsset.gpxPoints,
                      syncOffset: extra.syncOffset,
                      trackStyle: extra.trackStyle,
                      markerStyle: extra.markerStyle
                  });
              }
          });
      }

      return (
          <div style={{...style, pointerEvents: 'auto'}}>
              <MapPanel
                className="w-full h-full"
                tracks={tracks}
                currentTime={currentTime}
                // View settings come from the primary clip properties
                mapStyle={clip.properties.mapStyle}
                zoom={clip.properties.mapZoom}
              />
          </div>
      );
  }

  return null;
};
