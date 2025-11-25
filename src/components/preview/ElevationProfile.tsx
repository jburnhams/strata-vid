import React, { useState, useMemo, useCallback } from 'react';
import { GpxPoint, Asset, ExtraTrack } from '../../../types';
import { useProjectStore } from '../../../store/useProjectStore';

interface ElevationProfileProps {
  gpxAssets: (Asset | undefined)[];
  mainAssetId: string;
  extraTracks: ExtraTrack[];
  onSeek: (time: number) => void;
  currentTime: number;
  clipDuration: number;
}

const ElevationProfile: React.FC<ElevationProfileProps> = ({ gpxAssets, mainAssetId, extraTracks, onSeek, currentTime, clipDuration }) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string>(mainAssetId);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; dist: number; ele: number } | null>(null);

  const selectedAsset = useMemo(() => gpxAssets.find(asset => asset?.id === selectedTrackId), [gpxAssets, selectedTrackId]);
  const points = useMemo(() => selectedAsset?.gpxPoints || [], [selectedAsset]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    const cursorPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    if (points.length > 1) {
      const totalDistance = points[points.length - 1].dist!;
      const distanceAtCursor = (cursorPoint.x / svg.clientWidth) * totalDistance;

      let closestPoint = points[0];
      for (const point of points) {
        if (point.dist! > distanceAtCursor) break;
        closestPoint = point;
      }

      setTooltip({
        x: cursorPoint.x,
        y: e.clientY - svg.getBoundingClientRect().top,
        dist: distanceAtCursor,
        ele: closestPoint.ele!,
      });
    }
  };

  const handleMouseLeave = () => setTooltip(null);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    const cursorPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    if (points.length > 0) {
      const totalDistance = points[points.length - 1].dist!;
      const totalDuration = points[points.length - 1].time - points[0].time;
      const distanceAtCursor = (cursorPoint.x / svg.clientWidth) * totalDistance;

      let timeRatio = 0;
      for (let i = 1; i < points.length; i++) {
        if (points[i].dist! >= distanceAtCursor) {
          const prev = points[i-1];
          const curr = points[i];
          const segmentDist = curr.dist! - prev.dist!;
          const distIntoSegment = distanceAtCursor - prev.dist!;
          const ratio = segmentDist > 0 ? distIntoSegment / segmentDist : 0;
          const timeInSegment = (curr.time - prev.time) * ratio;
          timeRatio = (prev.time + timeInSegment - points[0].time) / totalDuration;
          break;
        }
      }
      onSeek(timeRatio * clipDuration);
    }
  };

  const { pathData, minEle, maxEle } = useMemo(() => {
    if (points.length < 2) return { pathData: '', minEle: 0, maxEle: 0 };

    const eleValues = points.map(p => p.ele).filter(e => e !== undefined) as number[];
    const min = Math.min(...eleValues);
    const max = Math.max(...eleValues);
    const totalDist = points[points.length - 1].dist!;

    const path = points.map((p, i) => {
      const x = (p.dist! / totalDist) * 100;
      const y = ((p.ele! - min) / (max - min)) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${100 - y}`;
    }).join(' ');

    return { pathData: path, minEle: min, maxEle: max };
  }, [points]);

  return (
    <div className="bg-gray-800 text-white p-2">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-bold">Elevation Profile</h4>
        {extraTracks.length > 0 && (
          <select
            value={selectedTrackId}
            onChange={e => setSelectedTrackId(e.target.value)}
            className="bg-gray-700 text-white text-xs rounded p-1"
          >
            <option value={mainAssetId}>Main Track</option>
            {extraTracks.map(track => (
              <option key={track.assetId} value={track.assetId}>
                {gpxAssets.find(a => a?.id === track.assetId)?.name || track.assetId}
              </option>
            ))}
          </select>
        )}
      </div>
      <svg
        className="w-full h-24"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <path d={pathData} fill="rgba(107, 114, 128, 0.5)" stroke="#6b7280" strokeWidth="0.5"/>
        {tooltip && (
          <line x1={tooltip.x} y1="0" x2={tooltip.x} y2="100" stroke="rgba(250, 204, 21, 0.7)" strokeWidth="0.5" />
        )}
      </svg>
      {tooltip && (
        <div className="text-xs absolute" style={{ left: tooltip.x, top: tooltip.y - 30 }}>
            Dist: {tooltip.dist.toFixed(0)}m, Ele: {tooltip.ele.toFixed(0)}m
        </div>
      )}
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{minEle.toFixed(0)}m</span>
        <span>{(points[points.length-1]?.dist/2 || 0).toFixed(0)}m</span>
        <span>{maxEle.toFixed(0)}m</span>
      </div>
    </div>
  );
};

export default ElevationProfile;
