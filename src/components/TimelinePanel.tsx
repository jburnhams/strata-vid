/**
 * The editor's timeline, on strata-react's Timeline (issue #77). The component draws lanes,
 * clips, the ruler, the playhead and markers, and reports every move, trim, selection and seek;
 * this panel applies them to the store, so the store's rules (overlaps, locked tracks, a trim
 * that moves the clip's in-point) stay here and nothing holds a second copy of the clips.
 *
 * What Timeline gives that the hand-built one did not: keyboard moves, trims and lane changes,
 * a named item per clip ("run-02.mp4, 0:12 to 0:47, Footage"), announcements, and a refusal shown
 * with its reason while dragging.
 *
 * Gaps, kept as small as they can be here (strata-react issues): lanes are one control high, so
 * thumbnails and waveforms are a strip; a clip's kind colour is the chart palette in order of
 * appearance, not the library's media colours; nothing can be dropped on a lane from outside, so
 * library files go on with their "Add to timeline" button.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Plus, Scissors, Trash2 } from 'lucide-react';
import {
  Button,
  ContextMenu,
  EmptyState,
  Timeline,
  TimelineZoomControls,
  Toggle,
  Toolbar,
  ToolbarSeparator,
  noOverlap,
  type MenuEntry,
  type TimelineChange,
  type TimelineItem,
} from 'strata-react';
import { useProjectStore } from '../store/useProjectStore';
import { AudioEngine } from '../services/AudioEngine';
import type { Clip } from '../types';
import { TrackHeader, trackName } from './timeline/TrackHeader';
import { WaveformOverlay } from './timeline/WaveformOverlay';

const KIND: Record<Clip['type'], string> = { video: 'Video', audio: 'Audio', map: 'Map', image: 'Image', text: 'Text', html: 'HTML', data: 'Data' };
const MIN_ZOOM = 1;
const MAX_ZOOM = 200;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export const TimelinePanel: React.FC = () => {
  const tracks = useProjectStore((state) => state.tracks);
  const clips = useProjectStore((state) => state.clips);
  const assets = useProjectStore((state) => state.assets);
  const trackOrder = useProjectStore((state) => state.trackOrder);
  const markers = useProjectStore((state) => state.markers);
  const currentTime = useProjectStore((state) => state.currentTime);
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const selectedClipId = useProjectStore((state) => state.selectedClipId);
  const settings = useProjectStore((state) => state.settings);
  const zoomLevel = useProjectStore((state) => state.zoomLevel);
  const store = useProjectStore.getState;

  const box = useRef<HTMLDivElement>(null);
  // The lanes' width: the panel less the track headers (strata's w-40), so the axis fills the view
  const [lanesWidth, setLanesWidth] = useState(800);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => setLanesWidth(Math.max(0, el.clientWidth - 160));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep the audio engine's tracks in step with the store
  useEffect(() => {
    const engine = AudioEngine.getInstance();
    Object.values(tracks).forEach(track => engine.registerTrack(track.id, track.volume ?? 1.0, track.isMuted));
  }, [tracks]);

  const items = useMemo<TimelineItem[]>(() => trackOrder.flatMap(trackId =>
    (tracks[trackId]?.clips ?? []).map(id => clips[id]).filter(Boolean).map(clip => ({
      id: clip.id,
      lane: clip.trackId,
      start: clip.start,
      length: clip.duration,
      label: assets[clip.assetId]?.name ?? clip.id,
      kind: KIND[clip.type] ?? clip.type,
    }))), [trackOrder, tracks, clips, assets]);

  const end = items.reduce((max, i) => Math.max(max, i.start + i.length), 0);
  const to = Math.max(end + 10, settings.duration || 0, 30, lanesWidth / zoomLevel);
  const fps = settings.fps || 30;

  const overlap = useMemo(() => noOverlap(items), [items]);
  const validate = (id: string, next: TimelineChange): string | null => {
    const clip = clips[id];
    if (!clip) return null;
    for (const laneId of new Set([clip.trackId, next.lane])) {
      const track = tracks[laneId];
      if (track?.isLocked) return `${trackName(track)} is locked.`;
    }
    // A trim at the start moves the in-point; it cannot go before the file's first frame
    if (next.start + next.length === clip.start + clip.duration && next.start < clip.start && clip.offset - (clip.start - next.start) < 0) {
      return 'The clip already starts at the beginning of its file.';
    }
    return settings.allowOverlaps ? null : overlap(id, next);
  };

  const applyChange = (id: string, next: TimelineChange) => {
    const clip = clips[id];
    if (!clip) return;
    const { moveClip, resizeClip } = store();
    if (next.length !== clip.duration) {
      // A trim. From the start, the in-point moves by as much as the start did.
      const shift = next.start - clip.start;
      resizeClip(id, next.length, Math.max(0, clip.offset + shift));
      if (shift !== 0) moveClip(id, next.start);
    } else {
      moveClip(id, next.start, next.lane !== clip.trackId ? next.lane : undefined);
    }
  };

  // The clip's context menu: strata-react commands, so an item that cannot run says why
  const clipMenu = (clipId: string): MenuEntry[] => {
    const clip = clips[clipId];
    const track = clip ? tracks[clip.trackId] : undefined;
    const trackClips = track ? track.clips.map(id => clips[id]).filter(Boolean).sort((a, b) => a.start - b.start) : [];
    const isFirst = trackClips.findIndex(c => c.id === clipId) <= 0;
    const playheadInside = !!clip && currentTime > clip.start && currentTime < clip.start + clip.duration;
    const s = store();
    return [
      { id: 'split', label: 'Split clip', icon: Scissors, disabled: playheadInside ? false : 'Move the playhead inside the clip', run: () => s.splitClip(clipId, currentTime) },
      { id: 'crossfade', label: 'Add crossfade (1s)', disabled: isFirst ? 'No clip before it on this track' : false, run: () => s.addTransition(clipId, { type: 'crossfade', duration: 1 }) },
      { id: 'duplicate', label: 'Duplicate clip', icon: Copy, run: () => s.duplicateClip(clipId) },
      'separator',
      { id: 'ripple-delete', label: 'Ripple delete', destructive: true, run: () => s.rippleDeleteClip(clipId) },
      { id: 'delete', label: 'Delete clip', icon: Trash2, destructive: true, run: () => s.removeClip(clipId) },
    ];
  };

  const renderClip = (item: TimelineItem) => {
    const clip = clips[item.id];
    const asset = clip ? assets[clip.assetId] : undefined;
    const viewMode = (clip && tracks[clip.trackId]?.viewMode) || 'frames';
    return (
      <ContextMenu label={`Clip ${item.label}`} items={clipMenu(item.id)}>
        <span className="relative flex h-full min-w-0 items-center" data-testid={`clip-item-${item.id}`}>
          {asset?.thumbnail && (viewMode === 'frames' || viewMode === 'both') && (
            <span
              aria-hidden
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{ backgroundImage: `url(${asset.thumbnail})`, backgroundSize: 'auto 100%', backgroundRepeat: 'repeat-x' }}
              data-testid="clip-thumbnail"
            />
          )}
          {asset?.waveform && clip && (clip.type === 'audio' || viewMode === 'waveform' || viewMode === 'both') && (
            <WaveformOverlay
              waveform={asset.waveform}
              assetDuration={asset.duration || 0}
              offset={clip.offset}
              duration={clip.duration}
              playbackRate={clip.playbackRate || 1}
            />
          )}
          <span className="relative min-w-0 flex-1 truncate" title={item.label}>{item.label}</span>
        </span>
      </ContextMenu>
    );
  };

  const zoom = {
    zoomIn: () => store().setZoomLevel(clampZoom(zoomLevel * 1.25)),
    zoomOut: () => store().setZoomLevel(clampZoom(zoomLevel / 1.25)),
    fit: () => store().setZoomLevel(clampZoom(lanesWidth / Math.max(end * 1.05, 10))),
  };

  const addTrack = () => store().addTrack({
    id: `track-${Date.now()}`,
    type: 'video',
    label: `Track ${trackOrder.length + 1}`,
    isMuted: false,
    isLocked: false,
    volume: 1.0,
    clips: [],
  });

  const lanes = trackOrder.map(id => tracks[id]).filter(Boolean).map(track => ({
    id: track.id,
    label: trackName(track),
    header: (
      <TrackHeader
        track={track}
        onRemove={(id) => store().removeTrack(id)}
        onToggleMute={(id) => store().updateTrack(id, { isMuted: !store().tracks[id]?.isMuted })}
        onToggleLock={(id) => store().updateTrack(id, { isLocked: !store().tracks[id]?.isLocked })}
        onUpdateVolume={(id, volume) => store().updateTrack(id, { volume })}
        onSetViewMode={(id, mode) => store().setTrackViewMode(id, mode)}
      />
    ),
  }));

  return (
    <div ref={box} className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-1">
        <Toolbar label="Timeline editing" className="flex items-center gap-2">
          <Button size="sm" onClick={addTrack}><Plus aria-hidden />Add track</Button>
          <Button size="sm" onClick={() => store().addMarker({ id: `marker-${Date.now()}`, time: currentTime, label: 'M', color: '#f59e0b' })}>Add marker</Button>
          <ToolbarSeparator />
          <Toggle size="sm" label="Snap" pressed={settings.snapToGrid ?? true} onChange={(on) => store().setSettings({ snapToGrid: on })} />
          <Toggle size="sm" label="Allow overlaps" pressed={settings.allowOverlaps ?? false} onChange={(on) => store().setSettings({ allowOverlaps: on })} />
        </Toolbar>
        <TimelineZoomControls zoom={zoom} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Timeline
          label="Timeline"
          lanes={lanes}
          items={items}
          to={to}
          zoom={zoomLevel}
          onZoomChange={(z) => store().setZoomLevel(clampZoom(z))}
          position={currentTime}
          onPositionChange={(time) => store().setPlaybackState({ currentTime: time })}
          follow={isPlaying}
          markers={markers.map(m => ({ id: m.id, time: m.time, label: m.label }))}
          selectedIds={selectedClipId ? new Set([selectedClipId]) : new Set()}
          onSelect={(ids) => store().selectClip(ids[ids.length - 1] ?? null)}
          onItemChange={applyChange}
          onDelete={(ids) => ids.forEach(id => store().removeClip(id))}
          validate={validate}
          snap={settings.snapToGrid ?? true}
          step={1 / fps}
          minLength={0.1}
          renderItem={renderClip}
          empty={
            <EmptyState title="No tracks yet">
              <Button size="sm" onClick={addTrack}><Plus aria-hidden />Add track</Button>
            </EmptyState>
          }
        />
      </div>
    </div>
  );
};
