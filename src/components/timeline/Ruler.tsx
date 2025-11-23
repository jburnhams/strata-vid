import React, { useEffect, useRef } from 'react';

interface RulerProps {
  zoomLevel: number; // pixels per second
  scrollLeft?: number;
  containerWidth?: number;
  duration?: number; // Total duration in seconds
  height?: number;
}

export const Ruler: React.FC<RulerProps> = ({
  zoomLevel,
  scrollLeft = 0,
  containerWidth = 1000,
  duration = 3600,
  height = 30
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Use containerWidth for canvas size to avoid crash with huge canvases
    // We add some buffer to avoid flickering at edges if desired, but for now just viewport width is safer
    const width = containerWidth;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#9ca3af'; // gray-400
    ctx.font = '10px sans-serif';
    ctx.textBaseline = 'top';

    // Calculate visible time range
    const startTime = scrollLeft / zoomLevel;
    const endTime = (scrollLeft + width) / zoomLevel;

    // Decide tick interval
    let tickInterval = 1; // seconds
    if (zoomLevel < 2) tickInterval = 60;
    else if (zoomLevel < 10) tickInterval = 10;
    else if (zoomLevel < 50) tickInterval = 5;
    else tickInterval = 1;

    // Align start to interval
    const startTick = Math.floor(startTime / tickInterval) * tickInterval;
    const endTick = Math.ceil(endTime / tickInterval) * tickInterval;

    for (let t = startTick; t <= endTick; t += tickInterval) {
      const x = (t * zoomLevel) - scrollLeft;

      // Draw only if within visible area (plus a bit of buffer)
      if (x >= -50 && x <= width + 50) {
          // Major tick
          ctx.fillRect(x, 0, 1, height / 2);

          // Label
          const minutes = Math.floor(t / 60);
          const seconds = t % 60;
          const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          ctx.fillText(timeString, x + 4, 2);
      }
    }

    // Minor ticks
    if (zoomLevel > 20) {
        const minorTickInterval = 1;
         for (let t = startTick; t <= endTick; t += 1) {
             if (t % tickInterval === 0) continue;
             const x = (t * zoomLevel) - scrollLeft;
             if (x >= -50 && x <= width + 50) {
                ctx.fillRect(x, 0, 1, height / 4);
             }
         }
    }

  }, [zoomLevel, scrollLeft, containerWidth, height]);

  // We position the canvas absolutely or sticky, but `left` needs to be offset by scrollLeft
  // actually, if we are inside a scrolling container, the `sticky` header moves with scroll.
  // BUT we want the canvas to stay fixed in the viewport while content scrolls?
  // No, we want the RULER to scroll.
  // But if we use a small canvas, we must translate it.

  // Option 1: Canvas is huge (CRASH RISK).
  // Option 2: Canvas is viewport sized, but sticky positioned?
  // If it's sticky, it stays in view. But we draw the content offset by `scrollLeft`.
  // So the canvas itself stays put relative to viewport (sticky), but we repaint it.

  // So style: sticky, left: 0.

  return (
    <canvas
      ref={canvasRef}
      className="block bg-gray-900 border-b border-gray-700 sticky left-0"
    />
  );
};
