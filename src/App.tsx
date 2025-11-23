import React from 'react';
import { LibraryPanel } from './components/LibraryPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { MetadataPanel } from './components/MetadataPanel';
import { TimelinePanel } from './components/TimelinePanel';
import { useProjectStore } from './store/useProjectStore';
import { AssetType, Asset, Track } from './types';
import { AssetLoader } from './services/AssetLoader';

function App() {
  const {
    assets: assetsRecord,
    clips: clipsRecord,
    tracks: tracksRecord,
    selectedAssetId,
    addAsset,
    selectAsset,
    addClip,
    addTrack
  } = useProjectStore();

  // Convert Records to Arrays for UI consumption and logic
  const assets = Object.values(assetsRecord || {});
  const clips = Object.values(clipsRecord || {});
  const tracks = Object.values(tracksRecord || {});

  const activeAsset = assets.find(a => a.id === selectedAssetId) || null;

  const handleAssetAdd = async (fileList: FileList) => {
    const newAssetsPromises = Array.from(fileList).map(async (file) => {
      try {
        return await AssetLoader.loadAsset(file);
      } catch (e) {
        console.error('Failed to load asset:', e);
        return null;
      }
    });

    const newAssets = (await Promise.all(newAssetsPromises)).filter((a): a is Asset => a !== null);

    newAssets.forEach(asset => {
        addAsset(asset);
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
        <button className="px-3 py-1 text-sm hover:bg-neutral-700 rounded">File</button>
        <button className="px-3 py-1 text-sm hover:bg-neutral-700 rounded">Edit</button>
        <button className="px-3 py-1 text-sm hover:bg-neutral-700 rounded">View</button>
        <div className="ml-auto text-xs text-neutral-500">v0.1.0</div>
      </div>

      {/* Library */}
      <div className="[grid-area:library] border-r border-neutral-700 bg-neutral-800 flex flex-col overflow-hidden">
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
      <div className="[grid-area:metadata] border-l border-neutral-700 bg-neutral-800 flex flex-col overflow-hidden">
        <MetadataPanel activeAsset={activeAsset} />
      </div>

      {/* Timeline */}
      <div className="[grid-area:timeline] border-t border-neutral-700 bg-neutral-800 flex flex-col overflow-hidden">
        <TimelinePanel clips={clips} />
      </div>
    </div>
  );
}

export default App;
