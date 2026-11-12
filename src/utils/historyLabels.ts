/**
 * Names a change to the document for the Edit menu ("Undo move clip"), from what changed between
 * two snapshots rather than from which action ran, so every store action gets a name without each one
 * declaring it. A change made by a continuous control (a slider, a number field being stepped, a
 * colour) gets a `key`, so strata-react's `useHistory` merges the run of changes into one step.
 *
 * Returns null for a change that is not worth a step on its own: a file's thumbnail or waveform
 * arriving after it was added.
 */
import type { DocumentSnapshot } from '../store/middleware/historyMiddleware';
import type { Clip, Track } from '../types';

export type ChangeName = { label: string; key?: string };

const added = <T,>(before: Record<string, T>, after: Record<string, T>) => Object.keys(after).filter((id) => !(id in before));
const removed = <T,>(before: Record<string, T>, after: Record<string, T>) => Object.keys(before).filter((id) => !(id in after));
const changed = <T,>(before: Record<string, T>, after: Record<string, T>) =>
  Object.keys(after).filter((id) => id in before && before[id] !== after[id]);

const PROPERTY_NAMES: Record<string, string> = {
  x: 'position', y: 'position', width: 'size', height: 'size', rotation: 'rotation', opacity: 'opacity',
  zIndex: 'layer order', filter: 'filter', mapStyle: 'map style', mapZoom: 'map zoom', trackStyle: 'route style',
  markerStyle: 'marker style', heatmap: 'heatmap', showElevationProfile: 'elevation profile',
};

const plural = (n: number, one: string) => (n === 1 ? one : `${one}s`);

function nameClipChange(id: string, before: Clip, after: Clip): ChangeName {
  // A trim from the start moves the start too, so trims are told apart first.
  if (before.duration !== after.duration || before.offset !== after.offset) return { label: 'trim clip' };
  if (before.start !== after.start || before.trackId !== after.trackId) return { label: 'move clip' };
  if (before.properties !== after.properties) {
    const keys = Object.keys({ ...before.properties, ...after.properties }).filter(
      (k) => (before.properties as unknown as Record<string, unknown>)[k] !== (after.properties as unknown as Record<string, unknown>)[k],
    );
    const names = [...new Set(keys.map((k) => PROPERTY_NAMES[k] ?? 'properties'))];
    const name = names.length === 1 ? names[0] : 'properties';
    return { label: `change ${name}`, key: `clip:${id}:${keys.sort().join(',')}` };
  }
  if (before.keyframes !== after.keyframes) return { label: 'change keyframes', key: `clip:${id}:keyframes` };
  if (before.volume !== after.volume) return { label: 'change clip volume', key: `clip:${id}:volume` };
  if (before.playbackRate !== after.playbackRate) return { label: 'change speed', key: `clip:${id}:rate` };
  if (before.transitionIn !== after.transitionIn) return { label: after.transitionIn ? 'add crossfade' : 'remove crossfade' };
  if (before.syncOffset !== after.syncOffset) return { label: 'change route sync', key: `clip:${id}:sync` };
  if (before.extraTrackAssets !== after.extraTrackAssets) return { label: 'change routes on map', key: `clip:${id}:extra` };
  if (before.content !== after.content || before.textStyle !== after.textStyle) return { label: 'edit text', key: `clip:${id}:text` };
  return { label: 'edit clip', key: `clip:${id}` };
}

function nameTrackChange(id: string, before: Track, after: Track): ChangeName {
  if (before.isMuted !== after.isMuted) return { label: after.isMuted ? 'mute track' : 'unmute track' };
  if (before.isLocked !== after.isLocked) return { label: after.isLocked ? 'lock track' : 'unlock track' };
  if (before.volume !== after.volume) return { label: 'change track volume', key: `track:${id}:volume` };
  if (before.label !== after.label) return { label: 'rename track', key: `track:${id}:label` };
  if (before.viewMode !== after.viewMode) return { label: 'change what clips show' };
  return { label: 'edit track' };
}

export function nameChange(before: DocumentSnapshot, after: DocumentSnapshot): ChangeName | null {
  const clipsAdded = added(before.clips, after.clips);
  const clipsRemoved = removed(before.clips, after.clips);
  const clipsChanged = changed(before.clips, after.clips);
  const tracksAdded = added(before.tracks, after.tracks);
  const tracksRemoved = removed(before.tracks, after.tracks);
  const assetsAdded = added(before.assets, after.assets);
  const assetsRemoved = removed(before.assets, after.assets);

  if (assetsRemoved.length) return { label: `remove ${plural(assetsRemoved.length, 'file')}` };
  if (tracksRemoved.length) return { label: `delete ${plural(tracksRemoved.length, 'track')}` };
  if (clipsRemoved.length) {
    const others = clipsChanged.filter((id) => before.clips[id].start !== after.clips[id].start);
    return { label: others.length ? 'ripple delete' : `delete ${plural(clipsRemoved.length, 'clip')}` };
  }
  if (clipsAdded.length) {
    if (clipsChanged.some((id) => before.clips[id].duration !== after.clips[id].duration)) return { label: 'split clip' };
    const twin = clipsAdded.length === 1 && Object.values(before.clips).some((c) => c.assetId === after.clips[clipsAdded[0]].assetId);
    return { label: twin ? 'duplicate clip' : `add ${plural(clipsAdded.length, 'clip')}` };
  }
  if (tracksAdded.length) return { label: 'add track' };
  if (assetsAdded.length) return { label: `add ${plural(assetsAdded.length, 'file')}` };
  if (clipsChanged.length === 1) return nameClipChange(clipsChanged[0], before.clips[clipsChanged[0]], after.clips[clipsChanged[0]]);
  if (clipsChanged.length > 1) return { label: 'edit clips' };
  const tracksChanged = changed(before.tracks, after.tracks);
  if (tracksChanged.length === 1) return nameTrackChange(tracksChanged[0], before.tracks[tracksChanged[0]], after.tracks[tracksChanged[0]]);
  if (before.trackOrder !== after.trackOrder && before.trackOrder.join() !== after.trackOrder.join()) return { label: 'reorder tracks' };
  if (before.markers !== after.markers) {
    if (after.markers.length > before.markers.length) return { label: 'add marker' };
    if (after.markers.length < before.markers.length) return { label: 'remove marker' };
    return { label: 'move marker', key: 'markers' };
  }
  if (before.settings !== after.settings) {
    const keys = Object.keys(after.settings).filter(
      (k) => (before.settings as unknown as Record<string, unknown>)[k] !== (after.settings as unknown as Record<string, unknown>)[k],
    );
    if (keys.length === 1 && keys[0] === 'duration') return null;
    return { label: 'change project settings', key: `settings:${keys.sort().join(',')}` };
  }
  // Only a file's derived data changed (thumbnail, waveform, link): not a step.
  return null;
}
