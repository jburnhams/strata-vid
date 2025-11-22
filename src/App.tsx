import React from 'react';
import { LibraryPanel } from './components/LibraryPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { MetadataPanel } from './components/MetadataPanel';
import { TimelinePanel } from './components/TimelinePanel';
import { useProjectStore } from './store/useProjectStore';
import { AssetType, Asset } from './types';
import { parseGpxFile } from './utils/gpxParser';

function App() {
  const {
    assets,
    timeline: clips,
    selectedAssetId,
    addAsset,
    selectAsset,
    addClip
  } = useProjectStore();

  const activeAsset = assets.find(a => a.id === selectedAssetId) || null;

  const handleAssetAdd = async (fileList: FileList) => {
    const newAssetsPromises = Array.from(fileList).map(async (file) => {
      const isVideo = file.type.startsWith('video/');
      const isGpx = file.name.toLowerCase().endsWith('.gpx');
      let type: AssetType = 'video';
      if (isGpx) type = 'gpx';

      const asset: Asset = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type,
        src: URL.createObjectURL(file),
        file
      };

      if (isGpx) {
        try {
          const { geoJson, stats } = await parseGpxFile(file);
          asset.geoJson = geoJson;
          asset.stats = stats;
        } catch (e) {
          console.error('Error parsing GPX:', e);
        }
      }

      return asset;
    });

    const newAssets = await Promise.all(newAssetsPromises);

    newAssets.forEach(asset => {
        addAsset(asset);
        if (asset.type === 'video') {
             // Placeholder logic: add to timeline
             addClip({
                 id: Math.random().toString(36).substr(2, 9),
                 assetId: asset.id,
                 start: 0,
                 duration: 10
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
        <PreviewPanel
          activeAsset={activeAsset}
          overlayAsset={assets.find(a => a.type === 'gpx')}
        />
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
