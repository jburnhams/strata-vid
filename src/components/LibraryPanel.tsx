import React from 'react';
import { Asset } from '../types';
import { Tooltip } from './Tooltip';
import { Trash2, AlertTriangle, FileVideo, Map, PlusCircle } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface LibraryPanelProps {
  assets: Asset[];
  selectedAssetId: string | null;
  onAssetAdd: (files: FileList) => void;
  onAssetSelect: (id: string) => void;
  onAssetRemove: (id: string) => void;
  onAssetUpdate: (id: string, file: File) => void;
  onAddToTimeline?: (id: string) => void;
}

const LibraryAssetItem: React.FC<{
  asset: Asset;
  selectedAssetId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, file: File) => void;
  onAddToTimeline?: (id: string) => void;
}> = ({ asset, selectedAssetId, onSelect, onRemove, onUpdate, onAddToTimeline }) => {
  const isMissing = !asset.file;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: asset.id,
    data: {
      type: 'Asset',
      asset
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRelink = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          onUpdate(id, e.target.files[0]);
          e.target.value = '';
      }
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(asset.id)}
      className={`p-2 cursor-grab rounded flex gap-3 items-center transition-colors group relative ${
        asset.id === selectedAssetId ? 'bg-neutral-700' : 'hover:bg-neutral-800/50'
      } border-l-4 ${asset.type === 'video' ? 'border-blue-500' : asset.type === 'audio' ? 'border-purple-500' : 'border-orange-500'}`}
      role="button"
      aria-selected={asset.id === selectedAssetId}
      tabIndex={0}
      onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
              onSelect(asset.id);
          }
      }}
      data-testid={`asset-item-${asset.id}`}
    >
      {asset.thumbnail ? (
        <div className="w-16 h-10 bg-black rounded overflow-hidden flex-shrink-0 relative">
            <img
              src={asset.thumbnail}
              alt={`Thumbnail for ${asset.name}`}
              className="w-full h-full object-cover"
            />
        </div>
      ) : (
        <div className="w-16 h-10 bg-neutral-900 rounded flex items-center justify-center flex-shrink-0 text-neutral-600">
            {asset.type === 'video' ? <FileVideo size={20} /> : <Map size={20} />}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
            <div className="font-medium text-sm text-neutral-200 truncate" title={asset.name}>
            {asset.name}
            </div>
            {isMissing && (
                <Tooltip content="File missing. Click to relink." position="top">
                     <label
                        className="text-yellow-500 hover:text-yellow-400 cursor-pointer p-1 rounded hover:bg-neutral-600/50"
                        onClick={(e) => e.stopPropagation()}
                     >
                        <AlertTriangle size={14} />
                        <input
                            type="file"
                            accept={asset.type === 'gpx' ? '.gpx' : asset.type === 'audio' ? 'audio/*' : 'video/*'}
                            className="hidden"
                            onChange={(e) => handleRelink(asset.id, e)}
                            data-testid={`relink-input-${asset.id}`}
                        />
                     </label>
                </Tooltip>
            )}
        </div>
        <div className="text-xs text-neutral-400 mt-0.5">
          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${asset.type === 'video' ? 'bg-blue-500' : asset.type === 'audio' ? 'bg-purple-500' : 'bg-orange-500'}`}></span>
          {asset.type === 'video' ? 'Video' : asset.type === 'audio' ? 'Audio' : 'GPX'}
          {asset.duration ? ` • ${Math.round(asset.duration)}s` : ''}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-neutral-800/90 rounded p-1 shadow-sm">
        {onAddToTimeline && (
             <Tooltip content="Add to Shortest Track" position="left">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddToTimeline(asset.id);
                    }}
                    className="p-1.5 text-green-500 hover:text-green-400 hover:bg-neutral-700 rounded transition-all"
                    aria-label={`Add ${asset.name} to timeline`}
                >
                    <PlusCircle size={14} />
                </button>
             </Tooltip>
        )}
        <Tooltip content="Remove Asset" position="left">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(asset.id);
                }}
                className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-700 rounded transition-all"
                aria-label={`Remove ${asset.name}`}
                data-testid={`remove-asset-${asset.id}`}
            >
                <Trash2 size={14} />
            </button>
        </Tooltip>
      </div>
    </li>
  );
};

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  assets,
  selectedAssetId,
  onAssetAdd,
  onAssetSelect,
  onAssetRemove,
  onAssetUpdate,
  onAddToTimeline
}) => {

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAssetAdd(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="library-panel">
      <div className="flex justify-between items-center p-4 border-b border-neutral-700 bg-neutral-800">
        <span className="font-bold text-sm text-neutral-300">Library</span>
        <Tooltip content="Add video or GPX files" position="bottom">
            <label className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium cursor-pointer transition-colors flex items-center gap-1" aria-label="Add Asset">
            + Add
            <input
                data-testid="add-asset-input"
                type="file"
                multiple
                accept="video/*,.gpx,audio/*"
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
            <LibraryAssetItem
                key={asset.id}
                asset={asset}
                selectedAssetId={selectedAssetId}
                onSelect={onAssetSelect}
                onRemove={onAssetRemove}
                onUpdate={onAssetUpdate}
                onAddToTimeline={onAddToTimeline}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};
