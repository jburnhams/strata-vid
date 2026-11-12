import { Button } from 'strata-react';
import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';

interface MapSyncControlProps {
  clipId: string;
  className?: string;
}

export const MapSyncControl: React.FC<MapSyncControlProps> = ({ clipId, className }) => {
  const clips = useProjectStore((state) => state.clips);
  const assets = useProjectStore((state) => state.assets);
  const updateClipSyncOffset = useProjectStore((state) => state.updateClipSyncOffset);
  const currentTime = useProjectStore((state) => state.currentTime);

  const clip = clips[clipId];
  const asset = clip ? assets[clip.assetId] : null;

  const [manualOffset, setManualOffset] = useState<string>('');
  const [gpxTimeInput, setGpxTimeInput] = useState<string>('');

  useEffect(() => {
    if (clip?.syncOffset !== undefined) {
      setManualOffset(clip.syncOffset.toString());
    }
  }, [clip?.syncOffset]);

  if (!clip || !asset || clip.type !== 'map') {
    return null;
  }

  // Find reference video (first video clip) to sync against
  // In a complex app, we might allow selecting which video to sync with.
  const referenceVideoClip = Object.values(clips).find(c => c.type === 'video');
  const referenceAsset = referenceVideoClip ? assets[referenceVideoClip.assetId] : null;

  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualOffset(e.target.value);
  };

  const applyOffset = () => {
    const offset = parseFloat(manualOffset);
    if (!isNaN(offset)) {
      updateClipSyncOffset(clipId, offset);
    }
  };

  const handleAutoSync = () => {
    if (referenceAsset && referenceAsset.creationTime) {
      // syncOffset = Video Creation Time (Epoch ms)
      // This assumes Video Start (0s) == Creation Time
      // If the video clip has an 'offset' (trimmed), we should account for it?
      // Video Time 0 (Timeline) = Video Source Time 'offset'.
      // Creation Time corresponds to Video Source Time 0.
      // So at Timeline 0, Source is 'offset'. Real Time is Creation + 'offset' * 1000.
      // So syncOffset (Timeline 0 -> Real Time) should be Creation + offset*1000.

      const videoStartRealTime = referenceAsset.creationTime.getTime() + (referenceVideoClip!.offset * 1000);

      setManualOffset(videoStartRealTime.toString());
      updateClipSyncOffset(clipId, videoStartRealTime);
    }
  };

  const formatTime = (date?: Date) => {
      if (!date) return 'Unknown';
      return date.toLocaleString();
  };

  return (
    <div className={`flex min-w-0 flex-col gap-4 type-body-sm ${className ?? ''}`}>
      <div className="flex flex-col gap-1 border-b border-border pb-2">
        <h3 className="font-bold text-foreground">Synchronization</h3>
        <div className="type-caption text-muted-foreground">
          GPX Start: {formatTime(asset.stats?.time?.start)}
        </div>
        {referenceAsset && (
            <div className="type-caption text-muted-foreground mt-1">
            Ref Video: {referenceAsset.name}<br/>
            Created: {formatTime(referenceAsset.creationTime)}
            </div>
        )}
      </div>

      {/* Auto Sync */}
      <div className="flex flex-col gap-2">
         <Button
            onClick={handleAutoSync}
            disabled={!referenceAsset?.creationTime}
            title={referenceAsset ? "Syncs to " + referenceAsset.name + " creation time" : "No video found to sync with"}
         >
            Auto-Sync to Video Metadata
         </Button>
      </div>

      {/* Manual Sync - Offset */}
      <div className="flex flex-col gap-1">
        <label className="type-caption text-muted-foreground uppercase font-semibold">Sync Offset (ms)</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={manualOffset}
            onChange={handleOffsetChange}
            className="flex-1 min-w-0 px-2 py-1 bg-background border border-border rounded-control text-foreground focus:border-primary outline-none"
            placeholder="Epoch ms at Video 0s"
          />
          <Button onClick={applyOffset}>Set</Button>
        </div>
        <p className="type-caption text-muted-foreground">
           Value represents the absolute GPX timestamp (epoch ms) that corresponds to Video Time 00:00.
        </p>
      </div>
    </div>
  );
};
