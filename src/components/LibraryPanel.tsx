import React from 'react';
import { Asset } from '../types';

interface LibraryPanelProps {
  assets: Asset[];
  selectedAssetId: string | null;
  onAssetAdd: (files: FileList) => void;
  onAssetSelect: (id: string) => void;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  assets,
  selectedAssetId,
  onAssetAdd,
  onAssetSelect
}) => {

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAssetAdd(e.target.files);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="library">
      <div className="panel-header">
        <span>Library</span>
        <label className="btn btn-primary" style={{cursor: 'pointer'}}>
          + Add
          <input
            type="file"
            multiple
            accept="video/*,.gpx"
            style={{display: 'none'}}
            onChange={handleFileChange}
          />
        </label>
      </div>
      <div className="panel-content">
        {assets.length === 0 && <div style={{color: '#666', fontStyle: 'italic'}}>No assets loaded</div>}
        <ul style={{listStyle: 'none', padding: 0}}>
          {assets.map(asset => (
            <li
              key={asset.id}
              onClick={() => onAssetSelect(asset.id)}
              style={{
                padding: '8px',
                cursor: 'pointer',
                backgroundColor: asset.id === selectedAssetId ? '#37373d' : 'transparent',
                marginBottom: '4px',
                borderRadius: '4px',
                borderLeft: `3px solid ${asset.type === 'video' ? '#007acc' : '#ce9178'}`
              }}
            >
              <div style={{fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                {asset.name}
              </div>
              <div style={{fontSize: '0.8rem', color: '#999'}}>
                {asset.type.toUpperCase()}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
