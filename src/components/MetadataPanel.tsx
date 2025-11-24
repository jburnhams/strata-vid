import React from 'react';
import { Asset } from '../types';
import { useProjectStore } from '../store/useProjectStore';
import { MapSyncControl } from './MapSyncControl';
import { VolumeControl } from './VolumeControl';

interface MetadataPanelProps {
  activeAsset: Asset | null;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ activeAsset }) => {
  const selectedClipId = useProjectStore((state) => state.selectedClipId);
  const clips = useProjectStore((state) => state.clips);
  const updateClipProperties = useProjectStore((state) => state.updateClipProperties);
  const updateClipVolume = useProjectStore((state) => state.updateClipVolume);

  const activeClip = selectedClipId ? clips[selectedClipId] : null;

  // Determine what to show
  // If a clip is selected, show clip metadata + sync controls
  // If not, show asset metadata (activeAsset)

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

                {(activeClip.type === 'video' || activeClip.type === 'audio') && (
                    <div className="mb-6 border-b border-neutral-700 pb-4">
                        <label className="text-xs text-gray-500 block mb-2">Volume</label>
                        <VolumeControl
                            volume={activeClip.volume ?? 1}
                            onChange={(v) => updateClipVolume(activeClip.id, v)}
                            className="w-full"
                        />
                    </div>
                )}

                {activeClip.type === 'map' && (
                    <>
                        <MapSyncControl clipId={activeClip.id} className="mb-6" />

                        <div className="border-t border-neutral-700 pt-4">
                             <h4 className="text-sm font-bold mb-3">Map Styling</h4>

                             <div className="mb-3">
                                 <label htmlFor="map-zoom" className="text-xs text-gray-500 block mb-1">Zoom Level ({activeClip.properties.mapZoom || 13})</label>
                                 <input
                                    id="map-zoom"
                                    type="range"
                                    min="1" max="18"
                                    value={activeClip.properties.mapZoom || 13}
                                    onChange={(e) => updateClipProperties(activeClip.id, { mapZoom: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-neutral-900 rounded-lg appearance-none cursor-pointer"
                                 />
                             </div>

                             <div className="mb-3">
                                 <label htmlFor="map-style" className="text-xs text-gray-500 block mb-1">Map Style</label>
                                 <select
                                    id="map-style"
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
                                 <label htmlFor="track-color" className="text-xs text-gray-500 block mb-1">Track Color</label>
                                 <input
                                    id="track-color"
                                    type="color"
                                    value={activeClip.properties.trackStyle?.color || '#007acc'}
                                    onChange={(e) => updateClipProperties(activeClip.id, {
                                        trackStyle: { ...activeClip.properties.trackStyle, color: e.target.value }
                                    })}
                                    className="w-full h-8 bg-neutral-900 border border-neutral-700 rounded cursor-pointer"
                                 />
                             </div>

                             <div className="mb-3">
                                 <label htmlFor="track-width" className="text-xs text-gray-500 block mb-1">Track Width</label>
                                 <input
                                    id="track-width"
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
                                 <label htmlFor="marker-color" className="text-xs text-gray-500 block mb-1">Marker Color</label>
                                 <input
                                    id="marker-color"
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
              {activeAsset.creationTime && (
                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-1">Created</div>
                  <div className="text-sm">{activeAsset.creationTime.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-500">Source: {activeAsset.creationTimeSource}</div>
                </div>
              )}
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
