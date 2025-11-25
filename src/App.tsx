import React from 'react';
import { LibraryPanel } from './components/LibraryPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { MetadataPanel } from './components/MetadataPanel';
import { TimelinePanel } from './components/TimelinePanel';
import { ProjectMenu } from './components/ProjectMenu';
import { EditMenu } from './components/EditMenu';
import { useProjectStore } from './store/useProjectStore';
import { Asset, Track } from './types';
import { AssetLoader } from './services/AssetLoader';
import { ExportModal } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ToastContainer } from './components/Toast';
import { LoadingOverlay } from './components/LoadingOverlay';
import { handleError, showSuccess } from './utils/errorHandler';
import { Tooltip } from './components/Tooltip';
import { useAutoSave } from './hooks/useAutoSave';
import { HelpCircle } from 'lucide-react';

function App() {
  const [showExport, setShowExport] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);

  const toggleHelp = () => setShowHelp(prev => !prev);
  useKeyboardShortcuts(toggleHelp);
  useAutoSave();

  const {
    assets: assetsRecord,
    clips: clipsRecord,
    tracks: tracksRecord,
    selectedAssetId,
    addAsset,
    updateAsset,
    selectAsset,
    addClip,
    addTrack,
    setLoading
  } = useProjectStore();

  // Convert Records to Arrays for UI consumption and logic
  const assets = Object.values(assetsRecord || {});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clips = Object.values(clipsRecord || {});
  const tracks = Object.values(tracksRecord || {});

  const activeAsset = assets.find(a => a.id === selectedAssetId) || null;

  const handleAssetAdd = async (fileList: FileList) => {
    setLoading(true, 'Loading assets...');
    try {
      const newAssetsPromises = Array.from(fileList).map(async (file) => {
        try {
          return await AssetLoader.loadAsset(file);
        } catch (e) {
          handleError(e, `Failed to load ${file.name}`);
          return null;
        }
      });

      const newAssets = (await Promise.all(newAssetsPromises)).filter((a): a is Asset => a !== null);

      newAssets.forEach(asset => {
          // Add basic asset immediately (with duration but no thumbnail)
          addAsset(asset);

          // Lazy load thumbnail
          if (asset.type === 'video' && asset.file) {
              AssetLoader.loadThumbnail(asset.file).then(thumbnail => {
                  updateAsset(asset.id, { thumbnail });
              }).catch(e => {
                  console.warn(`Failed to generate thumbnail for ${asset.name}`, e);
              });
          }

          if (asset.type === 'video') {
               // Find or create a video track
               let trackId = tracks.find(t => t.type === 'video')?.id;
               if (!trackId) {
                   trackId = Math.random().toString(36).substr(2, 9);
                   const newTrack: Track = {
                       id: trackId,
                       type: 'video',
                       label: 'Video Track 1',
                       isMuted: false,
                       isLocked: false,
                       clips: []
                   };
                   addTrack(newTrack);
               }

               // Add clip to the track
               addClip({
                   id: Math.random().toString(36).substr(2, 9),
                   assetId: asset.id,
                   trackId: trackId,
                   start: 0,
                   duration: asset.duration || 10,
                   offset: 0,
                   type: 'video',
                   properties: {
                       x: 0,
                       y: 0,
                       width: 100,
                       height: 100,
                       rotation: 0,
                       opacity: 1,
                       zIndex: 0
                   }
               });
          }
      });

      if (newAssets.length > 0) {
          selectAsset(newAssets[0].id);
          showSuccess(`Loaded ${newAssets.length} asset${newAssets.length > 1 ? 's' : ''}`);
      }
    } catch (e) {
      handleError(e, 'Failed to process assets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid h-screen w-screen bg-neutral-900 text-neutral-200 font-sans overflow-hidden"
         style={{
             gridTemplateAreas: '"header header header" "library preview metadata" "timeline timeline timeline"',
             gridTemplateColumns: '300px 1fr 300px',
             gridTemplateRows: '50px 1fr 200px'
         }}>

      {/* Header */}
      <div className="[grid-area:header] border-b border-neutral-700 bg-neutral-800 flex items-center px-4 gap-4">
        <span className="font-bold text-lg">Strata Vid</span>
        <ProjectMenu />
        <EditMenu />

        {/* Help Button */}
        <div className="ml-auto flex items-center gap-4">
          <Tooltip content="Keyboard Shortcuts (?)">
            <button
              onClick={toggleHelp}
              className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-700"
              aria-label="Help"
            >
              <HelpCircle size={20} />
            </button>
          </Tooltip>

          <Tooltip content="View Settings">
            <button
              className="px-3 py-1 text-sm hover:bg-neutral-700 rounded"
              aria-label="View Settings"
            >
              View
            </button>
          </Tooltip>

          <Tooltip content="Export Video">
            <button
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 rounded font-medium"
              onClick={() => setShowExport(true)}
              aria-label="Export Project"
            >
              Export
            </button>
          </Tooltip>
        </div>

        <div className="text-xs text-neutral-500 border-l border-neutral-700 pl-4">v0.1.0</div>
      </div>

      {/* Library */}
      <div className="[grid-area:library] border-r border-neutral-700 bg-neutral-800 flex flex-col overflow-hidden" data-testid="library-panel-container">
        <LibraryPanel
            assets={assets}
            selectedAssetId={selectedAssetId}
            onAssetAdd={handleAssetAdd}
            onAssetSelect={selectAsset}
        />
      </div>

      {/* Preview */}
      <div className="[grid-area:preview] bg-black flex items-center justify-center relative overflow-hidden">
        <PreviewPanel />
      </div>

      {/* Metadata */}
      <div className="[grid-area:metadata] border-l border-neutral-700 bg-neutral-800 flex flex-col overflow-hidden" data-testid="metadata-panel-container">
        <MetadataPanel activeAsset={activeAsset} />
      </div>

      {/* Timeline */}
      <div className="[grid-area:timeline] border-t border-neutral-700 bg-neutral-800 flex flex-col overflow-hidden">
        <TimelinePanel />
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      <ToastContainer />
      <LoadingOverlay />
    </div>
  );
}

export default App;
