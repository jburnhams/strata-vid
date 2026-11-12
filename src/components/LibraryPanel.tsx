import React from 'react';
import type { Asset } from '../types';
import { FileButton, FileDropZone, FileOutcomes, IconButton, MissingFile, Button, useFileIntake } from 'strata-react';
import { Trash2, FileAudio, FileImage, FileVideo, Map, Plus, PlusCircle } from 'lucide-react';

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

const KIND_ICON = { video: FileVideo, audio: FileAudio, image: FileImage, gpx: Map } as const;

/**
 * A library row. The part that selects the file is its own button, and the row's actions ("Add …
 * to timeline", "Remove …") are its siblings, not inside it (issue #143): until 2026-11-12 the row
 * was a `role="button"` holding both, so pressing an action also selected the file and each
 * action's name was part of the row's. The actions show on hover and whenever focus is in the row.
 */
const LibraryAssetItem: React.FC<{
  asset: Asset;
  selectedAssetId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, file: File) => void;
  onAddToTimeline?: (id: string) => void;
}> = ({ asset, selectedAssetId, onSelect, onRemove, onUpdate, onAddToTimeline }) => {
  const isMissing = !asset.file;
  const selected = asset.id === selectedAssetId;
  const KindIcon = KIND_ICON[asset.type] ?? FileVideo;
  const kindBorder = asset.type === 'video' ? 'border-media-video' : asset.type === 'audio' ? 'border-media-audio' : 'border-media-map';
  const kindDot = asset.type === 'video' ? 'bg-media-video' : asset.type === 'audio' ? 'bg-media-audio' : 'bg-media-map';
  const kindWord = asset.type === 'video' ? 'Video' : asset.type === 'audio' ? 'Audio' : asset.type === 'image' ? 'Image' : 'GPX';

  const details = (
    <div className="type-caption text-muted-foreground mt-0.5">
      <span className={`inline-block w-2 h-2 rounded-pill mr-1 ${kindDot}`}></span>
      {kindWord}
      {asset.duration ? ` • ${Math.round(asset.duration)}s` : ''}
    </div>
  );

  return (
    <li
      className={`rounded-control flex items-center transition-state group relative border-l-4 ${kindBorder} ${
        selected ? 'bg-muted' : 'hover:bg-card/50'
      }`}
      data-testid={`asset-item-${asset.id}`}
    >
      {isMissing ? (
        // A missing file gives its room to the name, the status and Relink (strata's MissingFile has no stacked layout)
        <div className="flex-1 min-w-0 p-2">
          <MissingFile name={asset.name} accept={acceptFor(asset.type)} onRelink={(file) => onUpdate(asset.id, file)} />
          {details}
        </div>
      ) : (
        <button
          type="button"
          className="flex-1 min-w-0 p-2 flex gap-3 items-center text-left cursor-pointer rounded-control"
          aria-current={selected ? 'true' : undefined}
          onClick={() => onSelect(asset.id)}
        >
          {asset.thumbnail ? (
            <div className="w-16 h-10 bg-footage rounded-control overflow-hidden flex-shrink-0 relative">
              <img src={asset.thumbnail} alt={`Thumbnail for ${asset.name}`} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-16 h-10 bg-background rounded-control flex items-center justify-center flex-shrink-0 text-muted-foreground">
              <KindIcon size={20} aria-hidden />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium type-body-sm text-foreground truncate" title={asset.name}>
              {asset.name}
            </div>
            {details}
          </div>
        </button>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity absolute right-2 bg-card/90 rounded-control p-1 shadow-overlay">
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

/** The order files were added in; files from before that was recorded keep their stored order, first. */
const byImportOrder = (a: Asset, b: Asset) => (a.importOrder ?? 0) - (b.importOrder ?? 0);

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
            {[...assets].sort(byImportOrder).map(asset => (
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
