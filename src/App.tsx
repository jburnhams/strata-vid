import React, { useState } from 'react';
import { LibraryPanel } from './components/LibraryPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { MetadataPanel } from './components/MetadataPanel';
import { TimelinePanel } from './components/TimelinePanel';
import { Asset, Clip, AssetType } from './types';
import './index.css';

function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const addAssets = (fileList: FileList) => {
    const newAssets: Asset[] = Array.from(fileList).map(file => {
      const isVideo = file.type.startsWith('video/');
      const isGpx = file.name.toLowerCase().endsWith('.gpx');

      let type: AssetType = 'video';
      if (isGpx) type = 'gpx';

      // Fallback for now, treat unknown as video or just accept it
      if (!isVideo && !isGpx) {
          // maybe log or ignore?
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type,
        src: URL.createObjectURL(file),
        file
      };
    });

    setAssets(prev => [...prev, ...newAssets]);

    // Auto-select the first new asset
    if (newAssets.length > 0) {
        setSelectedAssetId(newAssets[0].id);
    }

    // Logic to add to timeline if it's a video (placeholder behavior)
    const videos = newAssets.filter(a => a.type === 'video');
    if (videos.length > 0) {
       const newClips = videos.map(v => ({
         id: Math.random().toString(36).substr(2, 9),
         assetId: v.id,
         start: 0, // Just stack them at 0 for now or append? Appending is better.
         duration: 10 // Placeholder duration
       }));

       // Simplistic append logic
       setClips(prev => {
           const lastClip = prev[prev.length - 1];
           const startTime = lastClip ? lastClip.start + lastClip.duration : 0;

           // Update starts
           const adjustedClips = newClips.map((c, i) => ({
               ...c,
               start: startTime + (i * 10)
           }));

           return [...prev, ...adjustedClips];
       });
    }
  };

  const activeAsset = assets.find(a => a.id === selectedAssetId) || null;

  return (
    <div className="app-container">
      <div className="toolbar">
        <span style={{fontWeight: 'bold', fontSize: '1.2rem'}}>Strata Vid</span>
        <button className="btn">File</button>
        <button className="btn">Edit</button>
        <button className="btn">View</button>
        <div style={{marginLeft: 'auto', fontSize: '0.8rem', color: '#888'}}>v0.1.0</div>
      </div>

      <LibraryPanel
        assets={assets}
        selectedAssetId={selectedAssetId}
        onAssetAdd={addAssets}
        onAssetSelect={setSelectedAssetId}
      />

      <PreviewPanel activeAsset={activeAsset} />

      <MetadataPanel activeAsset={activeAsset} />

      <TimelinePanel clips={clips} />
    </div>
  );
}

export default App;
