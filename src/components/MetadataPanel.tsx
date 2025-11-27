import React, { useRef } from 'react';
import { Asset, DataOverlayOptions, ProjectSettings } from '../types';
import { useProjectStore } from '../store/useProjectStore';
import { MapSyncControl } from './MapSyncControl';
import { KeyframeList } from './KeyframeList';

interface MetadataPanelProps {
  assets: Asset[];
  selectedAssetId: string | null;
  settings: ProjectSettings;
  setSettings: (settings: Partial<ProjectSettings>) => void;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ assets, selectedAssetId, settings, setSettings }) => {
  const activeAsset = assets.find(a => a.id === selectedAssetId) || null;
  const {
    reprocessGpxAsset,
    selectedClipId,
    clips,
    updateClipProperties,
    addExtraTrackToClip,
    removeExtraTrackFromClip,
    updateExtraTrackOnClip,
  } = useProjectStore();

  const activeClip = selectedClipId ? clips[selectedClipId] : null;
  const addTrackSelectRef = useRef<HTMLSelectElement>(null);

  // Determine what to show
  // If a clip is selected, show clip metadata + sync controls
  // If not, show asset metadata (activeAsset)

  if (activeClip) {
      return (
          <div className="metadata h-full flex flex-col" data-testid="metadata-panel-clip">
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
                                 <label htmlFor="map-zoom" className="text-xs text-gray-500 block mb-1">Zoom Level ({activeClip.properties.mapZoom || 13})</label>
                                 <input
                                    id="map-zoom"
                                    type="range"
                                    min="1" max="18"
                                    value={activeClip.properties.mapZoom || 13}
                                    onChange={(e) => updateClipProperties(activeClip.id, { mapZoom: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-neutral-900 rounded-lg appearance-none cursor-pointer mb-2"
                                 />
                                 <KeyframeList clipId={activeClip.id} property="mapZoom" label="Zoom Animation" step={0.1} />
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
                                     <option value="dark">Dark Mode (CARTO)</option>
                                     <option value="custom">Custom</option>
                                 </select>
                             </div>

                             {activeClip.properties.mapStyle === 'custom' && (
                                <div className="mb-3">
                                    <label htmlFor="custom-map-style-url" className="text-xs text-gray-500 block mb-1">Custom Tile URL</label>
                                    <input
                                        id="custom-map-style-url"
                                        type="text"
                                        placeholder="https://.../{z}/{x}/{y}.png"
                                        value={activeClip.properties.customMapStyleUrl || ''}
                                        onChange={(e) => updateClipProperties(activeClip.id, { customMapStyleUrl: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-gray-200"
                                    />
                                </div>
                             )}

                            <div className="flex items-center my-3">
                                <input
                                    id="elevation-profile-enabled"
                                    type="checkbox"
                                    data-testid="show-elevation-checkbox"
                                    checked={activeClip.properties.showElevationProfile || false}
                                    onChange={(e) => updateClipProperties(activeClip.id, { showElevationProfile: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-800 focus:ring-2"
                                />
                                <label htmlFor="elevation-profile-enabled" className="ml-2 text-sm text-gray-300">Show Elevation Profile</label>
                            </div>

                             <div className="border-t border-neutral-700 pt-4 mt-4">
                                <h4 className="text-sm font-bold mb-3">Heatmap</h4>
                                <div className="flex items-center mb-3">
                                    <input
                                        id="heatmap-enabled"
                                        type="checkbox"
                                        checked={activeClip.properties.heatmap?.enabled || false}
                                        onChange={(e) => updateClipProperties(activeClip.id, {
                                            heatmap: { ...activeClip.properties.heatmap, enabled: e.target.checked }
                                        })}
                                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-800 focus:ring-2"
                                    />
                                    <label htmlFor="heatmap-enabled" className="ml-2 text-sm text-gray-300">Enable Heatmap</label>
                                </div>
                                {activeClip.properties.heatmap?.enabled && (
                                    <div className="mb-3">
                                        <label htmlFor="heatmap-source" className="text-xs text-gray-500 block mb-1">Data Source</label>
                                        <select
                                            id="heatmap-source"
                                            value={activeClip.properties.heatmap?.dataSource || 'speed'}
                                            onChange={(e) => updateClipProperties(activeClip.id, {
                                                heatmap: { ...activeClip.properties.heatmap, dataSource: e.target.value }
                                            })}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-gray-200"
                                        >
                                            <option value="speed">Speed</option>
                                            <option value="elevation">Elevation</option>
                                        </select>
                                    </div>
                                )}
                             </div>

                             <div className="border-t border-neutral-700 pt-4 mt-4">
                                <h4 className="text-sm font-bold mb-3">Primary Track Styling</h4>
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

                            <div className="border-t border-neutral-700 pt-4 mt-4">
                                <h4 className="text-sm font-bold mb-3">Extra Tracks</h4>
                                <div className="space-y-2 mb-4">
                                    {(activeClip.extraTrackAssets || []).map((extraTrack) => {
                                        const extraAsset = assets.find(a => a.id === extraTrack.assetId);
                                        return (
                                            <div key={extraTrack.assetId} className="bg-neutral-900 p-2 rounded border border-neutral-700">
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className="text-xs truncate" title={extraAsset?.name}>{extraAsset?.name || 'Unknown Asset'}</p>
                                                    <button
                                                        onClick={() => removeExtraTrackFromClip(activeClip.id, extraTrack.assetId)}
                                                        className="text-red-500 hover:text-red-400 text-xs font-bold"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <label htmlFor={`extra-track-color-${extraTrack.assetId}`} className="text-xs text-gray-500">Color</label>
                                                    <input
                                                        id={`extra-track-color-${extraTrack.assetId}`}
                                                        type="color"
                                                        value={extraTrack.trackStyle?.color || '#ff0000'}
                                                        onChange={(e) => updateExtraTrackOnClip(activeClip.id, extraTrack.assetId, {
                                                            trackStyle: {
                                                                color: e.target.value,
                                                                weight: extraTrack.trackStyle?.weight || 4,
                                                                opacity: extraTrack.trackStyle?.opacity || 1,
                                                            }
                                                        })}
                                                        className="w-6 h-6 bg-neutral-800 border-neutral-700 rounded cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex space-x-2">
                                    <select
                                        ref={addTrackSelectRef}
                                        id="add-extra-track-select"
                                        aria-label="Select a GPX asset to add"
                                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-gray-200"
                                    >
                                        <option value="">Select a GPX asset...</option>
                                        {assets
                                            .filter(a => a.type === 'gpx' && a.id !== activeClip.assetId && !(activeClip.extraTrackAssets || []).some(et => et.assetId === a.id))
                                            .map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                                        }
                                    </select>
                                    <button
                                        data-testid="add-extra-track-button"
                                        onClick={() => {
                                            if (addTrackSelectRef.current?.value) {
                                                addExtraTrackToClip(activeClip.id, addTrackSelectRef.current.value);
                                            }
                                        }}
                                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-sm"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeClip.type === 'data' && (
                    <>
                        <MapSyncControl clipId={activeClip.id} className="mb-6" />
                        <div className="border-t border-neutral-700 pt-4">
                            <h4 className="text-sm font-bold mb-3">Display Fields</h4>
                            <div className="space-y-2">
                                {(['showSpeed', 'showDistance', 'showElevation'] as const).map((field: keyof Pick<DataOverlayOptions, 'showSpeed' | 'showDistance' | 'showElevation'>) => (
                                    <div key={field} className="flex items-center">
                                        <input
                                            id={`data-${field}`}
                                            type="checkbox"
                                            checked={activeClip.properties.dataOverlay?.[field] ?? true}
                                            onChange={(e) => updateClipProperties(activeClip.id, {
                                                dataOverlay: { ...activeClip.properties.dataOverlay, [field]: e.target.checked }
                                            })}
                                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-800 focus:ring-2"
                                        />
                                        <label htmlFor={`data-${field}`} className="ml-2 text-sm text-gray-300">
                                            Show {field.replace('show', '')}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="border-t border-neutral-700 pt-4 mt-4">
                            <h4 className="text-sm font-bold mb-3">Units</h4>
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="speed-unit" className="text-xs text-gray-500 block mb-1">Speed Unit</label>
                                    <select
                                        id="speed-unit"
                                        value={activeClip.properties.dataOverlay?.speedUnit || 'kmh'}
                                        onChange={(e) => updateClipProperties(activeClip.id, {
                                            dataOverlay: { ...activeClip.properties.dataOverlay, speedUnit: e.target.value }
                                        })}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-gray-200"
                                    >
                                        <option value="kmh">km/h</option>
                                        <option value="mph">mph</option>
                                        <option value="m/s">m/s</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="distance-unit" className="text-xs text-gray-500 block mb-1">Distance Unit</label>
                                    <select
                                        id="distance-unit"
                                        value={activeClip.properties.dataOverlay?.distanceUnit || 'km'}
                                        onChange={(e) => updateClipProperties(activeClip.id, {
                                            dataOverlay: { ...activeClip.properties.dataOverlay, distanceUnit: e.target.value }
                                        })}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-gray-200"
                                    >
                                        <option value="km">km</option>
                                        <option value="mi">miles</option>
                                        <option value="m">meters</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="elevation-unit" className="text-xs text-gray-500 block mb-1">Elevation Unit</label>
                                    <select
                                        id="elevation-unit"
                                        value={activeClip.properties.dataOverlay?.elevationUnit || 'm'}
                                        onChange={(e) => updateClipProperties(activeClip.id, {
                                            dataOverlay: { ...activeClip.properties.dataOverlay, elevationUnit: e.target.value }
                                        })}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-gray-200"
                                    >
                                        <option value="m">meters</option>
                                        <option value="ft">feet</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeClip.type === 'data' && (
                    <div className="border-t border-neutral-700 pt-4 mt-4">
                        <h4 className="text-sm font-bold mb-3">Text Styling</h4>
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="font-size" className="text-xs text-gray-500 block mb-1">Font Size</label>
                                <input
                                    id="font-size"
                                    type="number"
                                    value={activeClip.textStyle?.fontSize || 16}
                                    onChange={(e) => updateClipProperties(activeClip.id, {
                                        textStyle: { ...activeClip.textStyle, fontSize: parseInt(e.target.value) }
                                    })}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-gray-200"
                                />
                            </div>
                            <div>
                                <label htmlFor="text-color" className="text-xs text-gray-500 block mb-1">Text Color</label>
                                <input
                                    id="text-color"
                                    type="color"
                                    value={activeClip.textStyle?.color || '#ffffff'}
                                    onChange={(e) => updateClipProperties(activeClip.id, {
                                        textStyle: { ...activeClip.textStyle, color: e.target.value }
                                    })}
                                    className="w-full h-8 bg-neutral-900 border border-neutral-700 rounded cursor-pointer"
                                />
                            </div>
                            <div>
                                <label htmlFor="background-color" className="text-xs text-gray-500 block mb-1">Background Color</label>
                                <input
                                    id="background-color"
                                    type="color"
                                    value={activeClip.textStyle?.backgroundColor || '#000000'}
                                    onChange={(e) => updateClipProperties(activeClip.id, {
                                        textStyle: { ...activeClip.textStyle, backgroundColor: e.target.value }
                                    })}
                                    className="w-full h-8 bg-neutral-900 border border-neutral-700 rounded cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeClip.type !== 'map' && activeClip.type !== 'data' && (
                     <div className="space-y-6">
                         <div>
                            <div className="flex justify-between mb-1">
                                <label htmlFor="opacity-slider" className="text-xs text-gray-500">Opacity</label>
                                <span className="text-xs text-gray-400">{Math.round(activeClip.properties.opacity * 100)}%</span>
                            </div>
                            <input
                                id="opacity-slider"
                                type="range"
                                min="0" max="1" step="0.01"
                                value={activeClip.properties.opacity}
                                onChange={(e) => updateClipProperties(activeClip.id, { opacity: parseFloat(e.target.value) })}
                                className="w-full mb-2 bg-neutral-900 h-2 rounded-lg appearance-none cursor-pointer"
                            />
                            <KeyframeList clipId={activeClip.id} property="opacity" label="Opacity Animation" step={0.01} />
                         </div>

                         <div>
                            <div className="flex justify-between mb-1">
                                <label htmlFor="rotation-slider" className="text-xs text-gray-500">Rotation</label>
                                <span className="text-xs text-gray-400">{Math.round(activeClip.properties.rotation)}°</span>
                            </div>
                            <input
                                id="rotation-slider"
                                type="range"
                                min="0" max="360" step="1"
                                value={activeClip.properties.rotation}
                                onChange={(e) => updateClipProperties(activeClip.id, { rotation: parseInt(e.target.value) })}
                                className="w-full mb-2 bg-neutral-900 h-2 rounded-lg appearance-none cursor-pointer"
                            />
                            <KeyframeList clipId={activeClip.id} property="rotation" label="Rotation Animation" step={1} />
                         </div>

                         <div>
                             <div className="flex justify-between mb-1">
                                <label htmlFor="pos-x-slider" className="text-xs text-gray-500">Position X (%)</label>
                                <span className="text-xs text-gray-400">{Math.round(activeClip.properties.x)}%</span>
                             </div>
                             <input
                                id="pos-x-slider"
                                type="range"
                                min="0" max="100" step="1"
                                value={activeClip.properties.x}
                                onChange={(e) => updateClipProperties(activeClip.id, { x: parseFloat(e.target.value) })}
                                className="w-full mb-2 bg-neutral-900 h-2 rounded-lg appearance-none cursor-pointer"
                             />
                             <KeyframeList clipId={activeClip.id} property="x" label="X Animation" step={1} />
                         </div>

                         <div>
                             <div className="flex justify-between mb-1">
                                <label htmlFor="pos-y-slider" className="text-xs text-gray-500">Position Y (%)</label>
                                <span className="text-xs text-gray-400">{Math.round(activeClip.properties.y)}%</span>
                             </div>
                             <input
                                id="pos-y-slider"
                                type="range"
                                min="0" max="100" step="1"
                                value={activeClip.properties.y}
                                onChange={(e) => updateClipProperties(activeClip.id, { y: parseFloat(e.target.value) })}
                                className="w-full mb-2 bg-neutral-900 h-2 rounded-lg appearance-none cursor-pointer"
                             />
                             <KeyframeList clipId={activeClip.id} property="y" label="Y Animation" step={1} />
                         </div>
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

            {activeAsset.type === 'gpx' && (
              <div className="space-y-2 border-t border-neutral-700 pt-4">
                <h5 className="font-bold text-sm mb-2">GPX Processing</h5>
                <div className="mb-3">
                  <label htmlFor="gpx-simplification" className="text-xs text-gray-500 block mb-1">
                    Simplification Tolerance ({settings.simplificationTolerance})
                  </label>
                  <input
                    id="gpx-simplification"
                    type="range"
                    min="0"
                    max="0.001"
                    step="0.00001"
                    value={settings.simplificationTolerance}
                    onChange={(e) => setSettings({ simplificationTolerance: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-neutral-900 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Higher values reduce detail.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (activeAsset) {
                      reprocessGpxAsset(activeAsset.id, settings.simplificationTolerance);
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
                >
                  Re-process GPX
                </button>
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
