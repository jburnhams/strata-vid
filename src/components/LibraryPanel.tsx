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
    <div className="flex flex-col h-full" data-testid="library-panel">
      <div className="flex justify-between items-center p-4 border-b border-neutral-700 bg-neutral-800">
        <span className="font-bold text-sm text-neutral-300">Library</span>
        <Tooltip content="Add video or GPX files" position="bottom">
            <label className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium cursor-pointer transition-colors" aria-label="Add Asset">
            + Add
            <input
                data-testid="add-asset-input"
                type="file"
                multiple
                accept="video/*,.gpx"
                className="hidden"
                onChange={handleFileChange}
            />
            </label>
        </Tooltip>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {assets.length === 0 && (
            <div className="text-center mt-10 text-neutral-500 italic text-sm">
                No assets loaded.<br/>Click "+ Add" to start.
            </div>
        )}
        <ul className="space-y-1">
          {assets.map(asset => (
            <li
              key={asset.id}
              onClick={() => onAssetSelect(asset.id)}
              className={`p-2 cursor-pointer rounded flex gap-3 items-start transition-colors ${
                asset.id === selectedAssetId ? 'bg-neutral-700' : 'hover:bg-neutral-800/50'
              } border-l-4 ${asset.type === 'video' ? 'border-blue-500' : 'border-orange-500'}`}
              role="button"
              aria-selected={asset.id === selectedAssetId}
              tabIndex={0}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                      onAssetSelect(asset.id);
                  }
              }}
              data-testid={`asset-item-${asset.id}`}
            >
              {asset.thumbnail && (
                <div className="w-16 h-10 bg-black rounded overflow-hidden flex-shrink-0">
                    <img
                      src={asset.thumbnail}
                      alt={`Thumbnail for ${asset.name}`}
                      className="w-full h-full object-cover"
                    />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-neutral-200 truncate" title={asset.name}>
                  {asset.name}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${asset.type === 'video' ? 'bg-blue-500' : 'bg-orange-500'}`}></span>
                  {asset.type === 'video' ? 'Video' : 'GPX'}
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
