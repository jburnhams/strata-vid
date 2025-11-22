import React, { useEffect, useRef } from 'react';
import { Asset } from '../types';

interface PreviewPanelProps {
  activeAsset: Asset | null;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ activeAsset }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && activeAsset && activeAsset.type === 'video') {
      videoRef.current.src = activeAsset.src;
    }
  }, [activeAsset]);

  return (
    <div className="preview">
      {activeAsset?.type === 'video' ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <video
            ref={videoRef}
            controls
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
          {/* Map Overlay Placeholder */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(0,0,0,0.5)',
            border: '1px dashed #ce9178',
            color: '#ce9178',
            padding: '10px',
            pointerEvents: 'none'
          }}>
            Map Overlay Layer
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#666' }}>
          {activeAsset ? `Preview not available for ${activeAsset.type}` : 'Select a video to preview'}
        </div>
      )}
    </div>
  );
};
