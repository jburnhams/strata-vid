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
import { placeOnTimeline } from './utils/timelinePlacement';
import { ExportModal } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ToastContainer } from './components/Toast';
import { LoadingOverlay } from './components/LoadingOverlay';
import { handleError, showSuccess } from './utils/errorHandler';
import { useAutoSave } from './hooks/useAutoSave';
import { Keyboard } from 'lucide-react';
import { AlertDialog, Button, ColorSchemeChoice, CommandMenu, IconButton, Menu, Pane, Split, Workspace, useWorkspaceState, type Command } from 'strata-react';

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
  const workspace = useWorkspaceState('strata-vid.workspace');

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

  // Files added together finish loading in any order; each takes its place in the library when it
  // is added, not when it is ready (issue #143).
  const importCount = React.useRef(0);
  const nextImportOrder = () => {
    const highest = Math.max(0, ...Object.values(useProjectStore.getState().assets).map(a => a.importOrder ?? 0));
    importCount.current = Math.max(importCount.current, highest) + 1;
    return importCount.current;
  };

  /** Loads one file for the library's file intake: a throw becomes that file's "Failed" row, with a retry. */
  const handleAddFile = async (file: File) => {
    const importOrder = nextImportOrder();
    const asset = await AssetLoader.loadAsset(file, {
      simplificationTolerance: settings.simplificationTolerance,
    });
    addAsset({ ...asset, importOrder });
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

  /** "Add to timeline": the track and span come from placeOnTimeline; the selection is left alone. */
  const addToTimeline = (assetId: string) => {
      const asset = assetsRecord[assetId];
      if (!asset) return;
      const { trackOrder } = useProjectStore.getState();
      const newId = () => Math.random().toString(36).slice(2, 11);
      const { newTrack, clip } = placeOnTimeline(asset, { tracks: tracksRecord, trackOrder, clips: clipsRecord }, newId);
      if (newTrack) addTrack(newTrack);
      addClip(clip);
      showSuccess('Added to timeline');
  };

  const panes = [
    { id: 'library', label: 'Library' },
    { id: 'inspector', label: 'Inspector' },
    { id: 'timeline', label: 'Timeline' },
  ];
  const viewCommands: Command[] = [
    ...panes.map(({ id, label }) => ({
      id: `show-${id}`,
      label: `Show ${label.toLowerCase()}`,
      checked: !workspace.isCollapsed(id),
      run: () => workspace.toggle(id),
    })),
    { id: 'reset-layout', label: 'Reset layout', run: workspace.reset },
  ];

  return (
        <div className="flex h-screen w-screen flex-col bg-background text-foreground font-sans overflow-hidden">

          <header className="h-12 shrink-0 border-b border-border bg-card flex items-center px-4 gap-2">
            <span className="type-label mr-2">Strata Vid</span>
            <ProjectMenu />
            <EditMenu />
            <Menu label="View" items={viewCommands} trigger={<Button variant="ghost">View</Button>} />

            <div className="ml-auto flex items-center gap-2">
              <IconButton variant="ghost" icon={Keyboard} label="Keyboard shortcuts" hint="?" onClick={toggleHelp} />
              <ColorSchemeChoice compact />
              <Button variant="default" onClick={() => setShowExport(true)}>
                Export video
              </Button>
            </div>

            <div className="type-caption text-muted-foreground border-l border-border pl-4 ml-2">v0.1.0</div>
          </header>

          {/* The editor's panes (strata-react Workspace, issue #68): library and inspector beside the
              stage, the timeline below; each resizes and folds, and the sizes are remembered. */}
          <Workspace label="Editor" state={workspace} className="min-h-0 flex-1">
            <Split direction="column">
              <Split direction="row">
                <Pane id="library" name="Library" size={300} min={220} collapsible>
                  <div className="flex h-full flex-col" data-testid="library">
                    <LibraryPanel
                        assets={assets}
                        selectedAssetId={selectedAssetId}
                        onAddFile={handleAddFile}
                        onAssetSelect={selectAsset}
                        onAssetRemove={handleAssetRemove}
                        onAssetUpdate={handleAssetUpdate}
                        onAddToTimeline={addToTimeline}
                    />
                  </div>
                </Pane>
                <Pane id="preview" name="Preview" grow>
                  <div className="h-full bg-footage flex items-center justify-center relative overflow-hidden" data-testid="preview">
                    <PreviewPanel />
                  </div>
                </Pane>
                <Pane id="inspector" name="Inspector" size={300} min={240} collapsible>
                  <div className="flex h-full flex-col" data-testid="metadata">
                    <MetadataPanel assets={assets} selectedAssetId={selectedAssetId} settings={settings} setSettings={setSettings} />
                  </div>
                </Pane>
              </Split>
              <Pane id="timeline" name="Timeline" size={240} min={160} collapsible>
                <div className="flex h-full flex-col" data-testid="timeline">
                  <TimelinePanel />
                </div>
              </Pane>
            </Split>
          </Workspace>

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
