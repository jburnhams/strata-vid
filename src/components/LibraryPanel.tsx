import React from 'react';
import { Asset } from '../types';
import { Tooltip } from './Tooltip';

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
        <Tooltip content="Add video or GPX files" position="bottom">
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
        </Tooltip>
      </div>
      <div className="panel-content">
        {assets.length === 0 && <div style={{color: '#666', fontStyle: 'italic'}}>No assets loaded</div>}
        <ul style={{listStyle: 'none', padding: 0}}>
          {assets.map(asset => (
            <li
              key={asset.id}
              onClick={() => onAssetSelect(asset.id)}
              className={`p-2 cursor-pointer mb-1 rounded flex gap-2 items-center ${
                asset.id === selectedAssetId ? 'bg-neutral-700' : 'hover:bg-neutral-800'
              } border-l-4 ${asset.type === 'video' ? 'border-blue-500' : 'border-orange-500'}`}
            >
              {asset.thumbnail && (
                <img
                  src={asset.thumbnail}
                  alt={asset.name}
                  className="w-12 h-12 object-cover rounded bg-black"
                />
              )}
              <div className="flex-1 overflow-hidden">
                <div className="font-bold text-sm truncate" title={asset.name}>
                  {asset.name}
                </div>
                <div className="text-xs text-neutral-400">
                  {asset.type.toUpperCase()}
                  {asset.duration ? ` • ${Math.round(asset.duration)}s` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
