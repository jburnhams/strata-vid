/**
 * Sync with footage: which moment of the route the map clip starts at.
 *
 * The clip stores that moment as `syncOffset`, the route's time (epoch ms) at the clip's start, and
 * the map's marker and the elevation profile both read it. Until 2026-11-12 this panel asked people
 * to type that epoch number into an unlabelled field ("Epoch ms at Video 0s") and wrote dates with
 * `toLocaleString`, unlike the inspector above it (issue #144). Now the number a person edits is
 * how far into the route the clip starts, in seconds, labelled, with the moment it names written
 * beside it; the epoch value stays internal. Dates go through strata's `format`, as everywhere else.
 */
import React from 'react';
import { Button, Field, NumberField, PropertyList, format } from 'strata-react';
import { useProjectStore } from '../store/useProjectStore';

interface MapSyncControlProps {
  clipId: string;
  className?: string;
}

/** A time of day to the second, for lining up a route with footage. */
const timeOfDay = (at: Date) => at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const MapSyncControl: React.FC<MapSyncControlProps> = ({ clipId, className }) => {
  const clips = useProjectStore((state) => state.clips);
  const assets = useProjectStore((state) => state.assets);
  const updateClipSyncOffset = useProjectStore((state) => state.updateClipSyncOffset);

  const clip = clips[clipId];
  const asset = clip ? assets[clip.assetId] : null;

  if (!clip || !asset || (clip.type !== 'map' && clip.type !== 'data')) {
    return null;
  }

  // The footage to sync against: the first video clip.
  const referenceVideoClip = Object.values(clips).find(c => c.type === 'video');
  const referenceAsset = referenceVideoClip ? assets[referenceVideoClip.assetId] : null;

  // The route's own first time, from its points; a route without times cannot be synced.
  const routeStart = asset.gpxPoints?.[0]?.time ?? null;
  // An offset of 0 (or none) means the clip starts at the route's first point.
  const syncedTo = clip.syncOffset || routeStart;
  const secondsIn = routeStart !== null && syncedTo !== null ? (syncedTo - routeStart) / 1000 : null;

  const handleAutoSync = () => {
    if (referenceAsset?.creationTime && referenceVideoClip) {
      // The footage's recorded time is its source's 0 s; the clip shows it from `offset` seconds in.
      updateClipSyncOffset(clipId, referenceAsset.creationTime.getTime() + referenceVideoClip.offset * 1000);
    }
  };

  const rows = [
    { term: 'Route starts', value: routeStart !== null ? format.dateTime(new Date(routeStart)) : null },
    ...(referenceAsset ? [{ term: `${referenceAsset.name} recorded`, value: referenceAsset.creationTime ? format.dateTime(referenceAsset.creationTime) : null }] : []),
  ];

  return (
    <div className={`grid min-w-0 gap-3 type-body-sm ${className ?? ''}`}>
      <PropertyList items={rows} />

      {referenceAsset ? (
        <Button onPress={handleAutoSync} disabled={!referenceAsset.creationTime}>
          {`Match ${referenceAsset.name}'s recorded time`}
        </Button>
      ) : (
        <p className="type-caption text-muted-foreground">Put footage on the timeline to match the route to it.</p>
      )}

      {secondsIn === null ? (
        <p className="type-caption text-muted-foreground">This route has no times, so the map cannot follow the footage.</p>
      ) : (
        <Field
          label="Clip starts into the route"
          hint={`At the clip's start the route is at ${timeOfDay(new Date(syncedTo!))}. Negative when the footage starts before the route.`}
        >
          <NumberField
            value={secondsIn}
            step={1}
            places={1}
            unit="s"
            onChange={(v) => { if (v !== null && routeStart !== null) updateClipSyncOffset(clipId, routeStart + v * 1000); }}
          />
        </Field>
      )}
    </div>
  );
};
