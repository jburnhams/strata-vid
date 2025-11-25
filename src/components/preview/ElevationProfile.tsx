import React, { useMemo } from 'react';
import { getCoordinateAtTime } from '../../utils/gpxParser';
import { GpxPoint } from '../../types';

interface ElevationProfileProps {
  gpxPoints: GpxPoint[];
  currentTime: number; // in seconds
  syncOffset?: number; // in milliseconds
  className?: string;
  style?: React.CSSProperties;
}

const ElevationProfile: React.FC<ElevationProfileProps> = ({
  gpxPoints,
  currentTime,
  syncOffset = 0,
  className,
  style,
}) => {
  const stats = useMemo(() => {
    if (!gpxPoints || gpxPoints.length < 2) {
      return null;
    }

    let minEle = Infinity;
    let maxEle = -Infinity;
    let pointsWithDist: GpxPoint[] = [];

    // Check if distance is already provided on the points. A simple check on the last point is sufficient.
    const hasDist = gpxPoints[gpxPoints.length - 1]?.dist !== undefined && gpxPoints[gpxPoints.length - 1]?.dist! > 0;

    if (hasDist) {
        pointsWithDist = gpxPoints;
    } else {
        // If not, calculate it
        let cumulativeDist = 0;
        pointsWithDist = gpxPoints.map((p, i) => {
            if (i > 0) {
                const prev = gpxPoints[i-1];
                const dx = (p.lon - prev.lon) * 40075000 * Math.cos((p.lat + prev.lat) * Math.PI / 360) / 360;
                const dy = (p.lat - prev.lat) * 111320;
                cumulativeDist += Math.sqrt(dx*dx + dy*dy);
            }
            return { ...p, dist: cumulativeDist };
        });
    }

    pointsWithDist.forEach(p => {
        minEle = Math.min(minEle, p.ele ?? minEle);
        maxEle = Math.max(maxEle, p.ele ?? maxEle);
    });

    const totalDist = pointsWithDist[pointsWithDist.length - 1]?.dist ?? 0;

    return { minEle, maxEle, totalDist, pointsWithDist };
  }, [gpxPoints]);

  const currentPos = useMemo(() => {
    if (!stats) return null;
    const baseTime = syncOffset || (gpxPoints[0]?.time ?? 0);
    const targetTime = baseTime + currentTime * 1000;
    return getCoordinateAtTime(stats.pointsWithDist, targetTime);
  }, [stats, gpxPoints, currentTime, syncOffset]);


  if (!stats) {
    return (
        <div className={className} style={style} data-testid="elevation-profile">
            <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>
        </div>
    );
  }

  const { minEle, maxEle, totalDist, pointsWithDist } = stats;

  const padding = { top: 10, right: 20, bottom: 20, left: 50 };
  const svgWidth = 800; // Use a fixed aspect ratio for responsiveness
  const svgHeight = 200;

  const xScale = (dist: number) => padding.left + (dist / totalDist) * (svgWidth - padding.left - padding.right);
  const yScale = (ele: number) => svgHeight - padding.bottom - ((ele - minEle) / (maxEle - minEle)) * (svgHeight - padding.top - padding.bottom);

  const pathData = pointsWithDist.map((p, i) => {
    const x = xScale(p.dist ?? 0);
    const y = yScale(p.ele ?? 0);
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  const currentX = currentPos?.dist !== undefined ? xScale(currentPos.dist) : -1;

  const firstTime = stats.pointsWithDist[0]?.time ?? 0;
  const lastTime = stats.pointsWithDist[stats.pointsWithDist.length - 1]?.time ?? 0;
  const gpxTime = (syncOffset || firstTime) + currentTime * 1000;
  const isTimeInRange = gpxTime >= firstTime && gpxTime <= lastTime;

  return (
    <div className={className} style={style} data-testid="elevation-profile">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        {/* Y-axis labels */}
        <text x={padding.left - 8} y={yScale(maxEle)} dy="0.32em" textAnchor="end" fill="white" fontSize="10">{maxEle.toFixed(0)}m</text>
        <text x={padding.left - 8} y={yScale(minEle)} dy="0.32em" textAnchor="end" fill="white" fontSize="10">{minEle.toFixed(0)}m</text>
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={svgHeight - padding.bottom} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

        {/* X-axis labels */}
        <text x={xScale(0)} y={svgHeight - padding.bottom + 15} textAnchor="start" fill="white" fontSize="10">0km</text>
        <text x={xScale(totalDist)} y={svgHeight - padding.bottom + 15} textAnchor="end" fill="white" fontSize="10">{(totalDist / 1000).toFixed(1)}km</text>
        <line x1={padding.left} y1={svgHeight - padding.bottom} x2={svgWidth - padding.right} y2={svgHeight - padding.bottom} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

        {/* Elevation path */}
        <path d={pathData} fill="none" stroke="#007acc" strokeWidth="2" />

        {/* Current position indicator */}
        {isTimeInRange && currentX > 0 && (
            <g>
                <line x1={currentX} y1={padding.top} x2={currentX} y2={svgHeight - padding.bottom} stroke="yellow" strokeWidth="1" strokeDasharray="4 2" />
                {currentPos && <circle cx={currentX} cy={yScale(currentPos.ele ?? 0)} r="4" fill="yellow" />}
            </g>
        )}
      </svg>
    </div>
  );
};

export default ElevationProfile;
