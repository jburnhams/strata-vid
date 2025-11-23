
import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';

interface MapSyncControlProps {
  clipId: string;
  className?: string;
}

export const MapSyncControl: React.FC<MapSyncControlProps> = ({ clipId, className }) => {
  const clip = useProjectStore((state) => state.clips[clipId]);
  const asset = useProjectStore((state) => state.assets[clip?.assetId]);
  const updateClipSyncOffset = useProjectStore((state) => state.updateClipSyncOffset);

  const [manualOffset, setManualOffset] = useState<string>(
    (clip?.syncOffset || 0).toString()
  );

  if (!clip || !asset || clip.type !== 'map') {
    return null;
  }

  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualOffset(e.target.value);
  };

  const applyOffset = () => {
    const offset = parseFloat(manualOffset);
    if (!isNaN(offset)) {
      updateClipSyncOffset(clipId, offset);
    }
  };

  const autoSync = () => {
    if (asset.stats?.time?.start) {
      // This assumes video starts at 0 in timeline?
      // Or maybe we need to know the video creation time?
      // For now let's just set it to the GPX start time (in ms)
      // So if video time is 0, GPX time is start time.
      const offset = asset.stats.time.start.getTime();
      setManualOffset(offset.toString());
      updateClipSyncOffset(clipId, offset);
    }
  };

  return (
    <div className={`flex flex-col gap-2 p-4 bg-gray-100 rounded ${className}`}>
      <h3 className="text-sm font-bold">Map Sync</h3>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-600">Sync Offset (ms)</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={manualOffset}
            onChange={handleOffsetChange}
            className="flex-1 px-2 py-1 border rounded text-sm"
          />
          <button
            onClick={applyOffset}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Set
          </button>
        </div>
      </div>
      <button
        onClick={autoSync}
        className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
      >
        Auto Sync (Use GPX Start)
      </button>
      <div className="text-xs text-gray-500 mt-1">
        Current Offset: {clip.syncOffset || 0} ms
      </div>
    </div>
  );
};
