import React from 'react';
import { LibraryPanel } from './components/LibraryPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { MetadataPanel } from './components/MetadataPanel';
import { TimelinePanel } from './components/TimelinePanel';
import { ProjectMenu } from './components/ProjectMenu';
import { EditMenu } from './components/EditMenu';
import { useProjectStore } from './store/useProjectStore';
import type { Asset, Track, Clip } from './types';
import { AssetLoader } from './services/AssetLoader';
import { ExportModal } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ToastContainer } from './components/Toast';
import { LoadingOverlay } from './components/LoadingOverlay';
import { handleError, showSuccess } from './utils/errorHandler';
import { useAutoSave } from './hooks/useAutoSave';
import { Keyboard } from 'lucide-react';
import { AlertDialog, Button, ColorSchemeChoice, CommandMenu, IconButton } from 'strata-react';

function App() {
  const [showExport, setShowExport] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [confirmModal, setConfirmModal] = React.useState<{ isOpen: boolean; assetId: string | null }>({
    isOpen: false,
    assetId: null,
  });

  const toggleHelp = () => setShowHelp(prev => !prev);
  const commands = useKeyboardShortcuts(toggleHelp);
  useAutoSave();

  const {
    assets: assetsRecord,
    clips: clipsRecord,
    tracks: tracksRecord,
    selectedAssetId,
    settings,
    setSettings,
    addAsset,
    updateAsset,
    removeAsset,
    selectAsset,
    addClip,
    addTrack,
    removeClipsByAssetId,
  } = useProjectStore();

  // Convert Records to Arrays for UI consumption and logic
  const assets = Object.values(assetsRecord || {});
  const clips = Object.values(clipsRecord || {});
  const tracks = Object.values(tracksRecord || {});

  /** Loads one file for the library's file intake: a throw becomes that file's "Failed" row, with a retry. */
  const handleAddFile = async (file: File) => {
    const asset = await AssetLoader.loadAsset(file, {
      simplificationTolerance: settings.simplificationTolerance,
    });
    addAsset(asset);
    selectAsset(asset.id);
    // The thumbnail follows; the asset is usable without it.
    if (asset.file) {
      AssetLoader.loadThumbnail(asset.file, asset.type)
        .then(thumbnail => updateAsset(asset.id, { thumbnail }))
        .catch(e => console.warn(`Failed to generate thumbnail for ${asset.name}`, e));
    }
  };

  const handleAssetUpdate = async (id: string, file: File) => {
      const asset = assetsRecord[id];
      if (!asset) return;

      try {
          // 1. Update source immediately to restore playback
          const src = URL.createObjectURL(file);
          updateAsset(id, { src, file });
          showSuccess(`Relinked ${asset.name}`);

          // 2. Regenerate thumbnail in background
          try {
              const thumbnail = await AssetLoader.loadThumbnail(file, asset.type);
              updateAsset(id, { thumbnail });
          } catch (e) {
              console.warn(`Failed to regenerate thumbnail for ${asset.name}`, e);
          }
      } catch (e) {
          handleError(e, `Failed to relink ${asset.name}`);
      }
  };

  const handleAssetRemove = (id: string) => {
    // Check if asset is used in any clip
    const isUsed = clips.some(clip => clip.assetId === id);

    if (isUsed) {
      setConfirmModal({ isOpen: true, assetId: id });
    } else {
      removeAsset(id);
    }
  };

  const confirmAssetRemove = () => {
    if (confirmModal.assetId) {
      removeClipsByAssetId(confirmModal.assetId);
      removeAsset(confirmModal.assetId);
      setConfirmModal({ isOpen: false, assetId: null });
    }
  };

  // Add Asset Helper (Button)
  const addAssetToShortestTrack = (assetId: string) => {
      const asset = assetsRecord[assetId];
      if(!asset) return;

      let bestTrackId = null;
      let minEndTime = Infinity;

      if (tracks.length === 0) {
           const newTrackId = Math.random().toString(36).substr(2, 9);
           addTrack({
               id: newTrackId,
               type: 'video',
               label: 'Track 1',
               isMuted: false,
               isLocked: false,
               volume: 1.0,
               clips: []
           });
           bestTrackId = newTrackId;
           minEndTime = 0;
      } else {
          tracks.forEach(track => {
              const trackClips = track.clips.map(id => clipsRecord[id]).filter(Boolean);
              let endTime = 0;
              trackClips.forEach(c => {
                  const e = c.start + c.duration;
                  if (e > endTime) endTime = e;
              });

              if (endTime < minEndTime) {
                  minEndTime = endTime;
                  bestTrackId = track.id;
              }
          });
      }

      if (bestTrackId) {
            addClip({
               id: Math.random().toString(36).substr(2, 9),
               assetId: asset.id,
               trackId: bestTrackId,
               start: minEndTime,
               duration: asset.duration || 10,
               offset: 0,
               type: asset.type === 'image' ? 'image' : asset.type === 'video' ? 'video' : asset.type === 'audio' ? 'audio' : 'map',
               properties: {
                   x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0
               },
               volume: 1.0
           });
           showSuccess('Added to timeline');
      }
  };

  return (
        <div className="grid h-screen w-screen bg-background text-foreground font-sans overflow-hidden"
             style={{
                 gridTemplateAreas: '"header header header" "library preview metadata" "timeline timeline timeline"',
                 gridTemplateColumns: '300px 1fr 300px',
                 gridTemplateRows: '50px 1fr 200px'
             }}>

          {/* Header */}
          <header className="[grid-area:header] border-b border-border bg-card flex items-center px-4 gap-2">
            <span className="type-label mr-2">Strata Vid</span>
            <ProjectMenu />
            <EditMenu />

            <div className="ml-auto flex items-center gap-2">
              <IconButton variant="ghost" icon={Keyboard} label="Keyboard shortcuts" hint="?" onClick={toggleHelp} />
              <ColorSchemeChoice compact />
              <Button variant="default" onClick={() => setShowExport(true)}>
                Export video
              </Button>
            </div>

            <div className="type-caption text-muted-foreground border-l border-border pl-4 ml-2">v0.1.0</div>
          </header>

          {/* Library */}
          <div className="[grid-area:library] border-r border-border bg-card flex flex-col overflow-hidden" data-testid="library">
            <LibraryPanel
                assets={assets}
                selectedAssetId={selectedAssetId}
                onAddFile={handleAddFile}
                onAssetSelect={selectAsset}
                onAssetRemove={handleAssetRemove}
                onAssetUpdate={handleAssetUpdate}
                onAddToTimeline={addAssetToShortestTrack}
            />
          </div>

          {/* Preview */}
          <div className="[grid-area:preview] bg-footage flex items-center justify-center relative overflow-hidden" data-testid="preview">
            <PreviewPanel />
          </div>

          {/* Metadata */}
          <div className="[grid-area:metadata] border-l border-border bg-card flex flex-col overflow-hidden" data-testid="metadata">
            <MetadataPanel assets={assets} selectedAssetId={selectedAssetId} settings={settings} setSettings={setSettings} />
          </div>

          {/* Timeline */}
          <div className="[grid-area:timeline] border-t border-border bg-card flex flex-col overflow-hidden" data-testid="timeline">
            <TimelinePanel />
          </div>

          {showExport && <ExportModal onClose={() => setShowExport(false)} />}
          {showHelp && <HelpModal commands={commands} onClose={() => setShowHelp(false)} />}
          <AlertDialog
            open={confirmModal.isOpen}
            onOpenChange={(open) => !open && setConfirmModal({ isOpen: false, assetId: null })}
            title={`Remove ${confirmModal.assetId ? assetsRecord[confirmModal.assetId]?.name ?? 'this file' : 'this file'}?`}
            description="It is used on the timeline. Its clips are removed with it."
            confirm="Remove file and clips"
            onConfirm={confirmAssetRemove}
          />
          <CommandMenu commands={commands} />
          <ToastContainer />
          <LoadingOverlay />

        </div>
  );
}

export default App;
