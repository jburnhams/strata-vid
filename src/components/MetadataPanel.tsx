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
