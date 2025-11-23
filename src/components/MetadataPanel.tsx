import React from 'react';
import { Asset } from '../types';

interface MetadataPanelProps {
  activeAsset: Asset | null;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ activeAsset }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-neutral-800 border-b border-neutral-700 px-4 py-2 font-bold text-sm">
        Metadata
      </div>
      <div className="p-4 overflow-y-auto flex-1">
        {activeAsset ? (
          <div className="space-y-4">
            {activeAsset.thumbnail && (
              <div className="rounded overflow-hidden border border-neutral-700">
                <img src={activeAsset.thumbnail} alt="Thumbnail" className="w-full h-auto" />
              </div>
            )}

            <div>
              <div className="text-xs text-neutral-400 mb-1">Name</div>
              <div className="text-sm break-all">{activeAsset.name}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-neutral-400 mb-1">Type</div>
                <div className="text-sm capitalize">{activeAsset.type}</div>
              </div>
              {activeAsset.file && (
                <div>
                  <div className="text-xs text-neutral-400 mb-1">Size</div>
                  <div className="text-sm">{(activeAsset.file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              )}
            </div>

            {activeAsset.type === 'video' && (
               <div className="grid grid-cols-2 gap-4 border-t border-neutral-700 pt-4">
                 <div>
                   <div className="text-xs text-neutral-400 mb-1">Duration</div>
                   <div className="text-sm">{activeAsset.duration ? `${Math.round(activeAsset.duration)}s` : 'Unknown'}</div>
                 </div>
                 <div>
                   <div className="text-xs text-neutral-400 mb-1">Resolution</div>
                   <div className="text-sm">
                     {activeAsset.resolution ? `${activeAsset.resolution.width}x${activeAsset.resolution.height}` : 'Unknown'}
                   </div>
                 </div>
               </div>
            )}

            {activeAsset.type === 'gpx' && activeAsset.stats && (
                <div className="space-y-2 border-t border-neutral-700 pt-4">
                  <h5 className="font-bold text-sm mb-2">GPX Statistics</h5>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div className="text-neutral-400">Distance</div>
                      <div>{(activeAsset.stats.distance.total / 1000).toFixed(2)} km</div>

                      <div className="text-neutral-400">Elev. Gain</div>
                      <div>{activeAsset.stats.elevation.gain.toFixed(0)} m</div>

                      <div className="text-neutral-400">Duration</div>
                      <div>{new Date(activeAsset.stats.time.duration).toISOString().substr(11, 8)}</div>
                  </div>
                </div>
            )}
          </div>
        ) : (
          <div className="text-neutral-500 italic text-center mt-10">Select an asset to view details</div>
        )}
      </div>
    </div>
  );
};
