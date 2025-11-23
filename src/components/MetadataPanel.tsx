import React from 'react';
import { Asset } from '../types';
import { useProjectStore } from '../store/useProjectStore';
import { MapSyncControl } from './MapSyncControl';

interface MetadataPanelProps {
  activeAsset: Asset | null;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ activeAsset: propAsset }) => {
  const selectedClipId = useProjectStore((state) => state.selectedClipId);
  const clips = useProjectStore((state) => state.clips);
  const updateClipProperties = useProjectStore((state) => state.updateClipProperties);

  const activeClip = selectedClipId ? clips[selectedClipId] : null;

  // Determine what to show
  // If a clip is selected, show clip metadata + sync controls
  // If not, show asset metadata (propAsset)

  if (activeClip) {
      return (
          <div className="metadata h-full flex flex-col">
            <div className="p-2 bg-neutral-800 border-b border-neutral-700 font-bold text-sm">
                Clip Properties
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
                <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-1">Type</div>
                    <div className="text-sm capitalize">{activeClip.type}</div>
                </div>

                {activeClip.type === 'map' && (
                    <>
                        <MapSyncControl clipId={activeClip.id} className="mb-6" />

                        <div className="border-t border-neutral-700 pt-4">
                             <h4 className="text-sm font-bold mb-3">Map Styling</h4>

                             <div className="mb-3">
                                 <label className="text-xs text-gray-500 block mb-1">Zoom Level ({activeClip.properties.mapZoom || 13})</label>
                                 <input
                                    type="range"
                                    min="1" max="18"
                                    value={activeClip.properties.mapZoom || 13}
                                    onChange={(e) => updateClipProperties(activeClip.id, { mapZoom: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-neutral-900 rounded-lg appearance-none cursor-pointer"
                                 />
                             </div>

                             <div className="mb-3">
                                 <label className="text-xs text-gray-500 block mb-1">Map Style</label>
                                 <select
                                    value={activeClip.properties.mapStyle || 'osm'}
                                    onChange={(e) => updateClipProperties(activeClip.id, { mapStyle: e.target.value })}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-gray-200"
                                 >
                                     <option value="osm">OpenStreetMap</option>
                                     <option value="mapbox">Mapbox (Demo)</option>
                                     <option value="satellite">Satellite (Esri)</option>
                                 </select>
                             </div>

                             <div className="mb-3">
                                 <label className="text-xs text-gray-500 block mb-1">Track Color</label>
                                 <input
                                    type="color"
                                    value={activeClip.properties.trackStyle?.color || '#007acc'}
                                    onChange={(e) => updateClipProperties(activeClip.id, {
                                        trackStyle: { ...activeClip.properties.trackStyle, color: e.target.value }
                                    })}
                                    className="w-full h-8 bg-neutral-900 border border-neutral-700 rounded cursor-pointer"
                                 />
                             </div>

                             <div className="mb-3">
                                 <label className="text-xs text-gray-500 block mb-1">Track Width</label>
                                 <input
                                    type="range"
                                    min="1" max="10"
                                    value={activeClip.properties.trackStyle?.weight || 4}
                                    onChange={(e) => updateClipProperties(activeClip.id, {
                                        trackStyle: { ...activeClip.properties.trackStyle, weight: parseInt(e.target.value) }
                                    })}
                                    className="w-full"
                                 />
                             </div>

                             <div className="mb-3">
                                 <label className="text-xs text-gray-500 block mb-1">Marker Color</label>
                                 <input
                                    type="color"
                                    value={activeClip.properties.markerStyle?.color || 'red'}
                                    onChange={(e) => updateClipProperties(activeClip.id, {
                                        markerStyle: { ...activeClip.properties.markerStyle, color: e.target.value }
                                    })}
                                    className="w-full h-8 bg-neutral-900 border border-neutral-700 rounded cursor-pointer"
                                 />
                             </div>
                        </div>
                    </>
                )}

                {activeClip.type !== 'map' && (
                     <div className="text-sm text-gray-500 italic">
                         Generic properties...
                     </div>
                )}
            </div>
          </div>
      );
  }

  return (
    <div className="metadata h-full flex flex-col">
      <div className="p-2 bg-neutral-800 border-b border-neutral-700 font-bold text-sm">
        Asset Metadata
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {propAsset ? (
          <div>
            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-1">Name</div>
              <div className="text-sm break-all">{propAsset.name}</div>
            </div>
            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-1">Type</div>
              <div className="text-sm capitalize">{propAsset.type}</div>
            </div>
            {propAsset.creationTime && (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-1">Created</div>
                  <div className="text-sm">{propAsset.creationTime.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-500">Source: {propAsset.creationTimeSource}</div>
                </div>
            )}
            {propAsset.file && (
               <div className="mb-4">
               <div className="text-xs text-gray-500 mb-1">Size</div>
               <div className="text-sm">{(propAsset.file.size / 1024 / 1024).toFixed(2)} MB</div>
             </div>
            )}

            {propAsset.type === 'gpx' && propAsset.stats && (
                <div className="mt-4 pt-4 border-t border-neutral-700">
                  <h5 className="text-sm font-bold mb-2">GPX Statistics</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-500">Distance</div>
                      <div>{(propAsset.stats.distance.total / 1000).toFixed(2)} km</div>

                      <div className="text-gray-500">Elev. Gain</div>
                      <div>{propAsset.stats.elevation.gain.toFixed(0)} m</div>

                      <div className="text-gray-500">Duration</div>
                      <div>{new Date(propAsset.stats.time.duration).toISOString().substr(11, 8)}</div>
                  </div>
                </div>
            )}
          </div>
        ) : (
          <div className="text-gray-600 italic text-sm text-center mt-10">No selection</div>
        )}
      </div>
    </div>
  );
};
