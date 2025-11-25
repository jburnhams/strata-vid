import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { GpxPoint } from '../../types';

interface HeatmapOverlayProps {
  points: GpxPoint[];
  // Additional options like intensity, radius, gradient will go here
}

const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({ points }) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      // Create canvas and add to map
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.pointerEvents = 'none';
      canvasRef.current = canvas;
      map.getPanes().overlayPane.appendChild(canvas);
    }

    const canvas = canvasRef.current;

    const drawHeatmap = () => {
      if (!canvas) return;

      const bounds = map.getBounds();
      const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
      const size = map.getSize();

      canvas.width = size.x;
      canvas.height = size.y;
      canvas.style.left = `${topLeft.x}px`;
      canvas.style.top = `${topLeft.y}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, size.x, size.y);

      const radius = 20; // Radius of each point
      const blur = 15;   // Blur intensity

      // 1. Create a separate buffer canvas to draw the points
      const buffer = document.createElement('canvas');
      buffer.width = size.x;
      buffer.height = size.y;
      const bufferCtx = buffer.getContext('2d');
      if (!bufferCtx) return;

      // 2. Draw points on the buffer
      points.forEach(p => {
        const point = map.latLngToLayerPoint([p.lat, p.lon]);
        const x = point.x - topLeft.x;
        const y = point.y - topLeft.y;

        // Create a radial gradient for a soft dot
        const gradient = bufferCtx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(1, 'transparent');

        bufferCtx.fillStyle = gradient;
        bufferCtx.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
      });

      // 3. Apply blur and colorize on the main canvas
      ctx.globalAlpha = 0.7;
      ctx.filter = `blur(${blur}px)`;

      // Draw the buffer to the main canvas
      ctx.drawImage(buffer, 0, 0);

      // 4. Colorize the heatmap (simple example: blue to red)
      const gradient = ctx.createLinearGradient(0, 0, size.x, 0);
      gradient.addColorStop(0, 'blue');
      gradient.addColorStop(0.5, 'lime');
      gradient.addColorStop(1, 'red');

      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size.x, size.y);

      // Reset composite operations
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'none';
    };

    // Redraw on map move/zoom
    map.on('moveend', drawHeatmap);
    drawHeatmap(); // Initial draw

    return () => {
      map.off('moveend', drawHeatmap);
      if (canvasRef.current) {
        map.getPanes().overlayPane.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, [map, points]);

  return null; // This component renders directly into the map pane
};

export default HeatmapOverlay;
