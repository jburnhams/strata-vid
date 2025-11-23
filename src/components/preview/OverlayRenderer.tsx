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
    pointerEvents: 'none', // Allow clicks to pass through to map? No, map needs interaction?
    // Usually overlays block interaction. But MapPanel has MapContainer which handles events.
    // If pointerEvents is none, Map won't be pannable.
    // Requirement says "drag, resize clips" in Section B, but Section D implies map interaction?
    // "Zoom level control: Option to auto-zoom ... or follow mode".
    // "Manual sync interface ... user scrubs video".
    // If this is preview, we might want map interaction.
    // However, in "Editor Mode", clicks on the preview usually select the clip.
    // For now, let's keep pointer-events: none for the container wrapper if it's just visual,
    // but MapPanel might need pointer events if we want to zoom/pan.
    // Let's assume for Preview purposes (passive watching), it's fine.
    // If the user wants to interact with the map, we might need a specific mode.
    // But wait, "Map overlay component... Zoom level control".
    // If I leave pointer-events: none, the map is static.
    // If I enable it, it might capture clicks meant for selecting the clip in the editor.
    // Given the current architecture where PreviewPanel handles selection?
    // Actually PreviewPanel doesn't seem to have selection logic on the overlay itself yet (Section B).
    // I'll leave pointerEvents: 'none' for consistency with other overlays for now,
    // but maybe MapPanel needs to override it?
    // If I set pointerEvents: 'auto' on the MapPanel div, it should work.
  };

  // Override pointer-events for map if interaction is desired?
  // For now let's keep it consistent.

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
          <div style={{...style, pointerEvents: 'auto'}}> {/* Enable interaction for map */}
              <MapPanel
                className="w-full h-full"
                geoJson={asset.geoJson}
                gpxPoints={asset.gpxPoints}
                currentTime={currentTime}
                syncOffset={clip.syncOffset}
                mapStyle={clip.properties.mapStyle}
                zoom={clip.properties.mapZoom}
                trackStyle={clip.properties.trackStyle}
                markerStyle={clip.properties.markerStyle}
              />
          </div>
      );
  }

  return null;
};
