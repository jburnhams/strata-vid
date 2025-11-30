import React, { useMemo } from 'react';

interface WaveformOverlayProps {
  waveform: number[];
  assetDuration: number;
  offset: number; // Source offset in seconds
  duration: number; // Timeline duration in seconds
  playbackRate: number;
  color?: string;
}

export const WaveformOverlay: React.FC<WaveformOverlayProps> = ({
  waveform,
  assetDuration,
  offset,
  duration,
  playbackRate,
  color = 'rgba(255, 255, 255, 0.5)'
}) => {
  const pathData = useMemo(() => {
    if (!waveform || waveform.length === 0 || assetDuration <= 0) return '';

    const sourceDuration = duration * playbackRate;

    // Calculate indices corresponding to the visible source range
    const startRatio = offset / assetDuration;
    const endRatio = (offset + sourceDuration) / assetDuration;

    const totalPoints = waveform.length;
    let startIndex = Math.floor(startRatio * totalPoints);
    let endIndex = Math.ceil(endRatio * totalPoints);

    // Clamp indices to valid range
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(totalPoints, endIndex);

    // Extract the subset of the waveform
    const slice = waveform.slice(startIndex, endIndex);

    // If slice is empty or has 1 point, create a minimal representation
    if (slice.length <= 1) {
       // If valid range but no points (resolution too low),
       // we should probably interpolate the value at 'offset'
       const index = Math.floor((startRatio + endRatio) / 2 * totalPoints);
       const val = waveform[Math.min(Math.max(0, index), totalPoints - 1)] || 0;
       const h = val * 50;
       return `M 0,${(50 - h).toFixed(2)} L 100,${(50 - h).toFixed(2)} L 100,${(50 + h).toFixed(2)} L 0,${(50 + h).toFixed(2)} Z`;
    }

    const topPoints: string[] = [];
    const bottomPoints: string[] = [];

    slice.forEach((val, i) => {
        const x = (i / (slice.length - 1)) * 100;
        const h = val * 50;
        // Top edge
        topPoints.push(`${x.toFixed(2)},${(50 - h).toFixed(2)}`);
        // Bottom edge (store to be reversed later)
        bottomPoints.push(`${x.toFixed(2)},${(50 + h).toFixed(2)}`);
    });

    // Combine top points left-to-right, then bottom points right-to-left
    return `M ${topPoints.join(' L ')} L ${bottomPoints.reverse().join(' L ')} Z`;
  }, [waveform, assetDuration, offset, duration, playbackRate]);

  if (!pathData) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-0"
      data-testid="waveform-overlay"
      style={{ opacity: 0.6 }} // Fixed opacity, color passed via fill
    >
       <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
         <path d={pathData} fill={color} stroke="none" />
       </svg>
    </div>
  );
};
