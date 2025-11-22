import React from 'react';
import { Asset } from '../types';

interface MetadataPanelProps {
  activeAsset: Asset | null;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ activeAsset }) => {
  return (
    <div className="metadata">
      <div className="panel-header">
        Metadata
      </div>
      <div className="panel-content">
        {activeAsset ? (
          <div>
            <div style={{marginBottom: '1rem'}}>
              <strong>Name:</strong><br/>
              {activeAsset.name}
            </div>
            <div style={{marginBottom: '1rem'}}>
              <strong>Type:</strong><br/>
              {activeAsset.type}
            </div>
            <div style={{marginBottom: '1rem'}}>
              <strong>Source:</strong><br/>
              Local File
            </div>
            {activeAsset.file && (
               <div style={{marginBottom: '1rem'}}>
               <strong>Size:</strong><br/>
               {(activeAsset.file.size / 1024 / 1024).toFixed(2)} MB
             </div>
            )}

            {activeAsset.type === 'gpx' && activeAsset.stats && (
                <div style={{marginBottom: '1rem', paddingTop: '1rem', borderTop: '1px solid #444'}}>
                  <h5 style={{marginBottom: '0.5rem', fontWeight: 'bold'}}>GPX Statistics</h5>
                  <div style={{display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem', fontSize: '0.9rem'}}>
                      <div className="text-gray-400">Distance:</div>
                      <div>{(activeAsset.stats.distance.total / 1000).toFixed(2)} km</div>

                      <div className="text-gray-400">Elev. Gain:</div>
                      <div>{activeAsset.stats.elevation.gain.toFixed(0)} m</div>

                      <div className="text-gray-400">Duration:</div>
                      <div>{new Date(activeAsset.stats.time.duration).toISOString().substr(11, 8)}</div>
                  </div>
                </div>
            )}

            <div style={{marginTop: '2rem', padding: '1rem', border: '1px dashed #555', borderRadius: '4px'}}>
              <h5>Map Properties (Placeholder)</h5>
              <label style={{display: 'block', marginTop: '0.5rem'}}>
                <input type="checkbox" disabled checked /> Show on Video
              </label>
              <label style={{display: 'block', marginTop: '0.5rem'}}>
                <input type="range" disabled /> Opacity
              </label>
            </div>
          </div>
        ) : (
          <div style={{color: '#666', fontStyle: 'italic'}}>No selection</div>
        )}
      </div>
    </div>
  );
};
