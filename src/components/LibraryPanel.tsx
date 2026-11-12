import React from 'react';
import type { Asset } from '../types';
import { FileButton, FileDropZone, FileOutcomes, IconButton, MissingFile, Button, useFileIntake } from 'strata-react';
import { Trash2, FileVideo, Map, Plus, PlusCircle } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface LibraryPanelProps {
  assets: Asset[];
  selectedAssetId: string | null;
  /** Loads one file into the project; a throw marks it failed, with its message, and offers a retry. */
  onAddFile: (file: File) => Promise<void>;
  onAssetSelect: (id: string) => void;
  onAssetRemove: (id: string) => void;
  onAssetUpdate: (id: string, file: File) => void;
  onAddToTimeline?: (id: string) => void;
}

/** What the picker offers for each kind, and for the library as a whole. */
const acceptFor = (type: Asset['type']): string[] =>
  type === 'gpx' ? ['.gpx'] : type === 'audio' ? ['audio/*'] : type === 'image' ? ['image/*'] : ['video/*'];
const ACCEPT = ['video/*', 'audio/*', '.gpx'];
const ACCEPT_LABEL = 'a video, an audio file or a GPX track';

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
      {/* A missing file gives its room to the name, the status and Relink (strata's MissingFile has no stacked layout) */}
      {isMissing ? null : asset.thumbnail ? (
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
        {isMissing ? (
          <div onClick={(e) => { if ((e.target as HTMLElement).closest('button')) e.stopPropagation(); }}>
            <MissingFile name={asset.name} accept={acceptFor(asset.type)} onRelink={(file) => onUpdate(asset.id, file)} />
          </div>
        ) : (
          <div className="font-medium type-body-sm text-foreground truncate" title={asset.name}>
            {asset.name}
          </div>
        )}
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
  onAddFile,
  onAssetSelect,
  onAssetRemove,
  onAssetUpdate,
  onAddToTimeline
}) => {
  // strata-react file intake (issue #75): the picker and drops go through one queue, and each file
  // gets its own outcome beside the library (added, not added with the reason, or failed with a
  // retry) instead of a full-screen loading overlay and a toast.
  const intake = useFileIntake({ accept: ACCEPT, acceptLabel: ACCEPT_LABEL, process: (file) => onAddFile(file) });
  const settled = intake.pending === 0 && intake.outcomes.length > 0;

  return (
    <div className="flex flex-col h-full" data-testid="library-panel">
      <div className="flex justify-between items-center p-4 border-b border-border bg-card">
        <h2 className="font-bold type-body-sm text-foreground">Library</h2>
        <FileButton size="sm" icon={Plus} accept={ACCEPT} multiple onFiles={intake.add}>Add files</FileButton>
      </div>
      {intake.outcomes.length > 0 && (
        <div className="grid gap-2 p-2 border-b border-border">
          <FileOutcomes intake={intake} />
          {settled && <Button size="sm" variant="ghost" className="justify-self-end" onClick={intake.clear}>Clear list</Button>}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-1 content-start gap-2">
        {assets.length > 0 && (
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
        )}
        <FileDropZone
          title={assets.length === 0 ? 'Drag videos, audio or GPX tracks here' : 'Drag more files here'}
          acceptLabel={ACCEPT_LABEL}
          onFiles={intake.add}
        >
          {assets.length === 0 && <FileButton size="sm" accept={ACCEPT} multiple onFiles={intake.add}>Choose files</FileButton>}
        </FileDropZone>
      </div>
    </div>
  );
};
