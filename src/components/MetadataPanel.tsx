/**
 * The right-hand panel: what is selected and its properties, on strata-react's `Inspector`
 * (issue #74). A selected clip is edited; a selected file is read (`PropertyList`). Sections
 * collapse and are remembered under `strata-vid.inspector`; a new selection gets fresh controls
 * (`selectionKey`), so a typed value never carries to the next clip.
 *
 * Values are strata value controls (issue #73): `NumberField` refuses an out-of-range typed value
 * and says why instead of clamping it, `Slider` prints its value with its unit, `ColorField` gives
 * hex entry and a contrast note against the map. A value set on/off at once is a `Switch`.
 *
 * Kept as they were, restyled only: `KeyframeList` (keyframes belong to the timeline family,
 * issue #77, not released) and `MapSyncControl` (map entry, issue #80, not released).
 */
import React, { useState } from 'react';
import {
  Button,
  ColorField,
  EmptyState,
  Field,
  Inspector,
  InspectorSection,
  NativeSelect,
  NumberField,
  PropertyList,
  PropertyRow,
  Slider,
  Switch,
  Input,
  IconButton,
  format,
  type Property,
} from 'strata-react';
import { Trash2 } from 'lucide-react';
import type { Asset, DataOverlayOptions, ProjectSettings } from '../types';
import { useProjectStore } from '../store/useProjectStore';
import { MapSyncControl } from './MapSyncControl';
import { KeyframeList } from './KeyframeList';

interface MetadataPanelProps {
  assets: Asset[];
  selectedAssetId: string | null;
  settings: ProjectSettings;
  setSettings: (settings: Partial<ProjectSettings>) => void;
}

const KIND: Record<string, string> = {
  video: 'Video clip', audio: 'Audio clip', image: 'Image clip', map: 'Map clip', data: 'Data overlay',
  text: 'Text clip', html: 'HTML clip',
};
const ASSET_KIND: Record<string, string> = { video: 'Video file', audio: 'Audio file', gpx: 'GPX track', image: 'Image file' };

/** The map is drawn on light tiles by default: track and marker colours are checked against them. */
const MAP_GROUND = '#f2efe9';

export const MetadataPanel: React.FC<MetadataPanelProps> = ({ assets, selectedAssetId, settings, setSettings }) => {
  const activeAsset = assets.find(a => a.id === selectedAssetId) || null;
  const {
    reprocessGpxAsset,
    selectedClipId,
    clips,
    updateClipProperties,
    updateClip,
    addExtraTrackToClip,
    removeExtraTrackFromClip,
    updateExtraTrackOnClip,
  } = useProjectStore();
  const [extraTrackToAdd, setExtraTrackToAdd] = useState('');

  const activeClip = selectedClipId ? clips[selectedClipId] : null;

  if (activeClip) {
    const clipAsset = assets.find(a => a.id === activeClip.assetId);
    const props = activeClip.properties;
    const addableGpx = assets.filter(a =>
      a.type === 'gpx' && a.id !== activeClip.assetId && !(activeClip.extraTrackAssets || []).some(et => et.assetId === a.id));

    return (
      <div className="h-full overflow-y-auto" data-testid="metadata-panel-clip">
        <Inspector
          title={clipAsset?.name ?? activeClip.id}
          kind={KIND[activeClip.type] ?? activeClip.type}
          selectionKey={activeClip.id}
          storageKey="strata-vid.inspector"
          empty={null}
        >
          {(activeClip.type === 'video' || activeClip.type === 'audio') && (
            <InspectorSection id="audio" title="Audio">
              <PropertyRow
                label="Volume"
                hint="Above 100% boosts the clip."
                modified={(activeClip.volume ?? 1) !== 1}
                onReset={() => updateClip(activeClip.id, { volume: 1 })}
              >
                <NumberField min={0} max={500} unit="%" value={Math.round((activeClip.volume ?? 1.0) * 100)}
                  onChange={(v) => v !== null && updateClip(activeClip.id, { volume: v / 100 })} />
              </PropertyRow>
            </InspectorSection>
          )}

          {(activeClip.type === 'map' || activeClip.type === 'data') && (
            <InspectorSection id="sync" title="Sync with footage">
              <MapSyncControl clipId={activeClip.id} />
            </InspectorSection>
          )}

          {activeClip.type === 'map' && (
            <>
              <InspectorSection id="map" title="Map">
                <PropertyRow label="Zoom level" modified={(props.mapZoom ?? 13) !== 13} onReset={() => updateClipProperties(activeClip.id, { mapZoom: 13 })}>
                  <Slider min={1} max={18} value={props.mapZoom || 13} onChange={(v) => updateClipProperties(activeClip.id, { mapZoom: v })} />
                </PropertyRow>
                <KeyframeList clipId={activeClip.id} property="mapZoom" label="Zoom animation" step={0.1} />
                <PropertyRow label="Map style">
                  <NativeSelect value={props.mapStyle || 'osm'} onChange={(e) => updateClipProperties(activeClip.id, { mapStyle: e.target.value })}>
                    <option value="osm">OpenStreetMap</option>
                    <option value="mapbox">Mapbox (demo)</option>
                    <option value="satellite">Satellite (Esri)</option>
                    <option value="dark">Dark (CARTO)</option>
                    <option value="custom">Custom tiles</option>
                  </NativeSelect>
                </PropertyRow>
                {props.mapStyle === 'custom' && (
                  <PropertyRow label="Tile URL" hint="With {z}, {x} and {y} where the tile numbers go.">
                    <Input placeholder="https://…/{z}/{x}/{y}.png" value={props.customMapStyleUrl || ''}
                      onChange={(e) => updateClipProperties(activeClip.id, { customMapStyleUrl: e.target.value })} />
                  </PropertyRow>
                )}
                <Switch label="Show elevation profile" on={props.showElevationProfile || false}
                  onChange={(on) => updateClipProperties(activeClip.id, { showElevationProfile: on })} />
              </InspectorSection>

              <InspectorSection id="heatmap" title="Heatmap" defaultOpen={false}>
                <Switch label="Colour the route by a reading" on={props.heatmap?.enabled || false}
                  onChange={(on) => updateClipProperties(activeClip.id, { heatmap: { ...props.heatmap, enabled: on } })} />
                {props.heatmap?.enabled && (
                  <PropertyRow label="Reading">
                    <NativeSelect value={props.heatmap?.dataSource || 'speed'}
                      onChange={(e) => updateClipProperties(activeClip.id, { heatmap: { ...props.heatmap, dataSource: e.target.value } })}>
                      <option value="speed">Speed</option>
                      <option value="elevation">Elevation</option>
                    </NativeSelect>
                  </PropertyRow>
                )}
              </InspectorSection>

              <InspectorSection id="route-style" title="Route style">
                <PropertyRow label="Route colour">
                  <ColorField aria-label="Route colour" value={props.trackStyle?.color || '#007acc'} against={MAP_GROUND} againstLabel="the map"
                    onChange={(c) => c && updateClipProperties(activeClip.id, { trackStyle: { ...props.trackStyle, color: c } })} />
                </PropertyRow>
                <PropertyRow label="Route width">
                  <Slider min={1} max={10} unit="px" value={props.trackStyle?.weight || 4}
                    onChange={(v) => updateClipProperties(activeClip.id, { trackStyle: { ...props.trackStyle, weight: v } })} />
                </PropertyRow>
                <PropertyRow label="Marker colour">
                  <ColorField aria-label="Marker colour" value={props.markerStyle?.color?.startsWith('#') ? props.markerStyle.color : '#ff0000'} against={MAP_GROUND} againstLabel="the map"
                    onChange={(c) => c && updateClipProperties(activeClip.id, { markerStyle: { ...props.markerStyle, color: c } })} />
                </PropertyRow>
              </InspectorSection>

              <InspectorSection id="extra-tracks" title="More routes" defaultOpen={false}>
                <ul className="space-y-2">
                  {(activeClip.extraTrackAssets || []).map((extraTrack) => {
                    const name = assets.find(a => a.id === extraTrack.assetId)?.name ?? 'Missing GPX file';
                    return (
                      <li key={extraTrack.assetId} className="flex items-end gap-2">
                        <Field label={name} className="flex-1 min-w-0">
                          <ColorField aria-label={`${name} colour`} value={extraTrack.trackStyle?.color || '#ff0000'} against={MAP_GROUND} againstLabel="the map"
                            onChange={(c) => c && updateExtraTrackOnClip(activeClip.id, extraTrack.assetId, {
                              trackStyle: { color: c, weight: extraTrack.trackStyle?.weight || 4, opacity: extraTrack.trackStyle?.opacity || 1 },
                            })} />
                        </Field>
                        <IconButton variant="ghost" icon={Trash2} label={`Remove ${name}`}
                          onPress={() => removeExtraTrackFromClip(activeClip.id, extraTrack.assetId)} />
                      </li>
                    );
                  })}
                </ul>
                <Field
                  label="Add a route"
                  hint={addableGpx.length === 0 ? 'Load another GPX file to show it here.' : undefined}
                  action={
                    <Button data-testid="add-extra-track-button" disabled={!extraTrackToAdd}
                      onClick={() => { addExtraTrackToClip(activeClip.id, extraTrackToAdd); setExtraTrackToAdd(''); }}>
                      Add
                    </Button>
                  }
                >
                  <NativeSelect value={extraTrackToAdd} onChange={(e) => setExtraTrackToAdd(e.target.value)} disabled={addableGpx.length === 0}>
                    <option value="">Choose a GPX file</option>
                    {addableGpx.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </NativeSelect>
                </Field>
              </InspectorSection>
            </>
          )}

          {activeClip.type === 'data' && (
            <>
              <InspectorSection id="data-fields" title="Readings shown">
                {(['showSpeed', 'showDistance', 'showElevation'] as const).map((field: keyof Pick<DataOverlayOptions, 'showSpeed' | 'showDistance' | 'showElevation'>) => (
                  <Switch key={field} label={field.replace('show', '')} on={props.dataOverlay?.[field] ?? true}
                    onChange={(on) => updateClipProperties(activeClip.id, { dataOverlay: { ...props.dataOverlay, [field]: on } })} />
                ))}
              </InspectorSection>
              <InspectorSection id="units" title="Units">
                <PropertyRow label="Speed">
                  <NativeSelect value={props.dataOverlay?.speedUnit || 'kmh'}
                    onChange={(e) => updateClipProperties(activeClip.id, { dataOverlay: { ...props.dataOverlay, speedUnit: e.target.value } })}>
                    <option value="kmh">km/h</option>
                    <option value="mph">mph</option>
                    <option value="m/s">m/s</option>
                  </NativeSelect>
                </PropertyRow>
                <PropertyRow label="Distance">
                  <NativeSelect value={props.dataOverlay?.distanceUnit || 'km'}
                    onChange={(e) => updateClipProperties(activeClip.id, { dataOverlay: { ...props.dataOverlay, distanceUnit: e.target.value } })}>
                    <option value="km">kilometres</option>
                    <option value="mi">miles</option>
                    <option value="m">metres</option>
                  </NativeSelect>
                </PropertyRow>
                <PropertyRow label="Elevation">
                  <NativeSelect value={props.dataOverlay?.elevationUnit || 'm'}
                    onChange={(e) => updateClipProperties(activeClip.id, { dataOverlay: { ...props.dataOverlay, elevationUnit: e.target.value } })}>
                    <option value="m">metres</option>
                    <option value="ft">feet</option>
                  </NativeSelect>
                </PropertyRow>
              </InspectorSection>
              <InspectorSection id="text-style" title="Text style">
                <PropertyRow label="Font size">
                  <NumberField min={6} max={200} unit="px" value={activeClip.textStyle?.fontSize || 16}
                    onChange={(v) => v !== null && updateClipProperties(activeClip.id, { textStyle: { ...activeClip.textStyle, fontSize: v } })} />
                </PropertyRow>
                <PropertyRow label="Text colour">
                  <ColorField aria-label="Text colour" value={activeClip.textStyle?.color || '#ffffff'} against={activeClip.textStyle?.backgroundColor || '#000000'} againstLabel="its background"
                    onChange={(c) => c && updateClipProperties(activeClip.id, { textStyle: { ...activeClip.textStyle, color: c } })} />
                </PropertyRow>
                <PropertyRow label="Background colour">
                  <ColorField aria-label="Background colour" value={activeClip.textStyle?.backgroundColor || '#000000'}
                    onChange={(c) => c && updateClipProperties(activeClip.id, { textStyle: { ...activeClip.textStyle, backgroundColor: c } })} />
                </PropertyRow>
              </InspectorSection>
            </>
          )}

          {activeClip.type !== 'map' && activeClip.type !== 'data' && (
            <InspectorSection id="transform" title="Position and look">
              <PropertyRow label="Opacity" modified={props.opacity !== 1} onReset={() => updateClipProperties(activeClip.id, { opacity: 1 })}>
                <Slider min={0} max={100} unit="%" value={Math.round(props.opacity * 100)}
                  onChange={(v) => updateClipProperties(activeClip.id, { opacity: v / 100 })} />
              </PropertyRow>
              <KeyframeList clipId={activeClip.id} property="opacity" label="Opacity animation" step={0.01} />
              <PropertyRow label="Rotation" modified={props.rotation !== 0} onReset={() => updateClipProperties(activeClip.id, { rotation: 0 })}>
                <Slider min={0} max={360} unit="°" value={Math.round(props.rotation)}
                  onChange={(v) => updateClipProperties(activeClip.id, { rotation: v })} />
              </PropertyRow>
              <KeyframeList clipId={activeClip.id} property="rotation" label="Rotation animation" step={1} />
              <PropertyRow label="Position X" modified={props.x !== 0} onReset={() => updateClipProperties(activeClip.id, { x: 0 })}>
                <Slider min={0} max={100} unit="%" value={Math.round(props.x)}
                  onChange={(v) => updateClipProperties(activeClip.id, { x: v })} />
              </PropertyRow>
              <KeyframeList clipId={activeClip.id} property="x" label="X animation" step={1} />
              <PropertyRow label="Position Y" modified={props.y !== 0} onReset={() => updateClipProperties(activeClip.id, { y: 0 })}>
                <Slider min={0} max={100} unit="%" value={Math.round(props.y)}
                  onChange={(v) => updateClipProperties(activeClip.id, { y: v })} />
              </PropertyRow>
              <KeyframeList clipId={activeClip.id} property="y" label="Y animation" step={1} />
            </InspectorSection>
          )}
        </Inspector>
      </div>
    );
  }

  const file: Property[] = activeAsset ? [
    { term: 'Created', value: activeAsset.creationTime ? format.dateTime(activeAsset.creationTime) : null },
    { term: 'Date from', value: activeAsset.creationTimeSource ?? null },
    { term: 'Size', value: activeAsset.file ? format.bytes(activeAsset.file.size) : null },
  ] : [];

  const video = activeAsset?.type === 'video' ? [
    { term: 'Duration', value: activeAsset.duration ? format.runningTime(activeAsset.duration) : null },
    { term: 'Resolution', value: activeAsset.resolution ? `${activeAsset.resolution.width}×${activeAsset.resolution.height}` : null },
    { term: 'Container', value: activeAsset.videoMetadata?.format },
    { term: 'Video codec', value: activeAsset.videoMetadata?.videoCodec },
    { term: 'Frame rate', value: activeAsset.videoMetadata?.frameRate ?? null, unit: 'fps' },
    { term: 'Bitrate', value: activeAsset.videoMetadata?.bitrate ? format.decimal(activeAsset.videoMetadata.bitrate / 1_000_000) : null, unit: 'Mbps' },
    { term: 'Audio codec', value: activeAsset.videoMetadata?.audioCodec },
    { term: 'Sample rate', value: activeAsset.videoMetadata?.sampleRate ? activeAsset.videoMetadata.sampleRate / 1000 : null, unit: 'kHz' },
    { term: 'Channels', value: activeAsset.videoMetadata?.channels ?? null },
  ] satisfies Property[] : [];

  const gpx = activeAsset?.type === 'gpx' && activeAsset.stats ? [
    { term: 'Distance', value: format.decimal(activeAsset.stats.distance.total / 1000), unit: 'km' },
    { term: 'Climb', value: format.integer(activeAsset.stats.elevation.gain), unit: 'm' },
    { term: 'Moving time', value: format.runningTime(activeAsset.stats.time.duration / 1000) },
  ] satisfies Property[] : [];

  return (
    <div className="h-full overflow-y-auto">
      <Inspector
        title={activeAsset?.name ?? null}
        kind={activeAsset ? ASSET_KIND[activeAsset.type] ?? activeAsset.type : undefined}
        selectionKey={activeAsset?.id}
        storageKey="strata-vid.inspector"
        summary={activeAsset?.thumbnail ? (
          <img src={activeAsset.thumbnail} alt={`First frame of ${activeAsset.name}`} className="w-full rounded-control border border-border" />
        ) : undefined}
        empty={<EmptyState title="Nothing selected">Select a file in the library or a clip on the timeline to see its details here.</EmptyState>}
      >
        <InspectorSection id="file" title="File">
          <PropertyList items={file} />
        </InspectorSection>
        {video.length > 0 && (
          <InspectorSection id="video-details" title="Video">
            <PropertyList items={video} />
          </InspectorSection>
        )}
        {gpx.length > 0 && (
          <InspectorSection id="gpx-stats" title="Route">
            <PropertyList items={gpx} />
          </InspectorSection>
        )}
        {activeAsset?.type === 'gpx' && (
          <InspectorSection id="gpx-processing" title="Route detail" defaultOpen={false}>
            <PropertyRow label="Simplification" hint="Higher values drop more points from the route.">
              <Slider min={0} max={0.001} step={0.00001} places={5} value={settings.simplificationTolerance}
                onChange={(v) => setSettings({ simplificationTolerance: v })} />
            </PropertyRow>
            <Button onClick={() => reprocessGpxAsset(activeAsset.id, settings.simplificationTolerance)}>
              Re-process route
            </Button>
          </InspectorSection>
        )}
      </Inspector>
    </div>
  );
};
