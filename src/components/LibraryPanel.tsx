import React from 'react';
import type { Asset } from '../types';
import { IconButton, buttonVariants } from 'strata-react';
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
      className={`p-2 cursor-grab rounded-control flex gap-3 items-center transition-state group relative ${
        asset.id === selectedAssetId ? 'bg-muted' : 'hover:bg-card/50'
      } border-l-4 ${asset.type === 'video' ? 'border-media-video' : asset.type === 'audio' ? 'border-media-audio' : 'border-media-map'}`}
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
        <div className="w-16 h-10 bg-footage rounded-control overflow-hidden flex-shrink-0 relative">
            <img
              src={asset.thumbnail}
              alt={`Thumbnail for ${asset.name}`}
              className="w-full h-full object-cover"
            />
        </div>
      ) : (
        <div className="w-16 h-10 bg-background rounded-control flex items-center justify-center flex-shrink-0 text-muted-foreground">
            {asset.type === 'video' ? <FileVideo size={20} /> : <Map size={20} />}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
            <div className="font-medium type-body-sm text-foreground truncate" title={asset.name}>
            {asset.name}
            </div>
            {isMissing && (
                     <label
                        className="text-warning cursor-pointer p-1 rounded-control hover:bg-muted"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`File missing. Relink ${asset.name}`}
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
            )}
        </div>
        <div className="type-caption text-muted-foreground mt-0.5">
          <span className={`inline-block w-2 h-2 rounded-pill mr-1 ${asset.type === 'video' ? 'bg-media-video' : asset.type === 'audio' ? 'bg-media-audio' : 'bg-media-map'}`}></span>
          {asset.type === 'video' ? 'Video' : asset.type === 'audio' ? 'Audio' : 'GPX'}
          {asset.duration ? ` • ${Math.round(asset.duration)}s` : ''}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-card/90 rounded-control p-1 shadow-overlay">
        {onAddToTimeline && (
            <IconButton
                variant="ghost"
                icon={PlusCircle}
                label={`Add ${asset.name} to timeline`}
                onPress={() => onAddToTimeline(asset.id)}
            />
        )}
        <IconButton
            variant="ghost"
            icon={Trash2}
            label={`Remove ${asset.name}`}
            data-testid={`remove-asset-${asset.id}`}
            onPress={() => onRemove(asset.id)}
        />
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
      <div className="flex justify-between items-center p-4 border-b border-border bg-card">
        <span className="font-bold type-body-sm text-foreground">Library</span>
        {/* A native file input until strata-react's FileButton (issue #75) is released. */}
            <label className={buttonVariants({ size: 'sm' }) + ' cursor-pointer'} aria-label="Add Asset">
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
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {assets.length === 0 && (
            <div className="text-center mt-10 text-muted-foreground italic type-body-sm">
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
