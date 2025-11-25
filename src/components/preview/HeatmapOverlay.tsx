
import { useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { GpxPoint } from '../../types';
import { haversineDistance } from '../../utils/gpxParser';
import { getColor } from '../../utils/color';

interface HeatmapOverlayProps {
  points: GpxPoint[];
  dataSource?: 'speed' | 'elevation';
  gradient?: Record<number, string>;
}

// Default gradient: blue -> green -> yellow -> red
const defaultGradient = {
  0.0: '#0000ff',
  0.4: '#00ff00',
  0.6: '#ffff00',
  1.0: '#ff0000',
};

const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({
  points,
  dataSource = 'speed',
  gradient = defaultGradient,
}) => {
  const map = useMap();

  const processedPoints = useMemo(() => {
    if (points.length < 2) return [];

    return points.slice(1).map((p, i) => {
      const prev = points[i];
      const dist = haversineDistance(prev.lat, prev.lon, p.lat, p.lon);
      const timeDiff = (p.time - prev.time) / 1000; // in seconds
      const speed = timeDiff > 0 ? dist / timeDiff : 0; // m/s
      return { ...p, speed };
    });
  }, [points]);

  const [min, max] = useMemo(() => {
      if (processedPoints.length === 0) return [0, 1];
      const values = processedPoints.map(p => dataSource === 'speed' ? p.speed : p.ele || 0);
      return [Math.min(...values), Math.max(...values)];
  }, [processedPoints, dataSource]);

  useEffect(() => {
    const canvasLayer = L.canvasLayer();

    canvasLayer.draw = () => {
      const ctx = canvasLayer.getCanvas()?.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';

      for (let i = 1; i < processedPoints.length; i++) {
        const p1 = processedPoints[i - 1];
        const p2 = processedPoints[i];

        const value = dataSource === 'speed' ? p2.speed : p2.ele || 0;
        const normalized = max === min ? 1 : (value - min) / (max - min);

        ctx.strokeStyle = getColor(normalized, gradient);

        const point1 = map.latLngToContainerPoint([p1.lat, p1.lon]);
        const point2 = map.latLngToContainerPoint([p2.lat, p2.lon]);

        ctx.beginPath();
        ctx.moveTo(point1.x, point1.y);
        ctx.lineTo(point2.x, point2.y);
        ctx.stroke();
      }
    };

    canvasLayer.addTo(map);

    return () => {
      map.removeLayer(canvasLayer);
    };
  }, [map, processedPoints, min, max, dataSource, gradient]);

  return null; // This component renders via Leaflet layer, not React DOM
};

// Simple canvas layer for Leaflet
L.CanvasLayer = (L.Layer as any).extend({
    onAdd: function (map: L.Map) {
        this._map = map;
        this._canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer');
        const size = map.getSize();
        this._canvas.width = size.x;
        this._canvas.height = size.y;

        map.getPanes().overlayPane.appendChild(this._canvas);

        map.on('moveend', this._reset, this);
        if (map.options.zoomAnimation && L.Browser.any3d) {
            map.on('zoomanim', this._animateZoom, this);
        }

        this._reset();
        return this;
    },
    onRemove: function (map: L.Map) {
        if (this._canvas) {
            L.DomUtil.remove(this._canvas);
        }
        map.off('moveend', this._reset, this);
        map.off('zoomanim', this._animateZoom, this);
    },
    getCanvas: function() {
        return this._canvas;
    },
    _reset: function() {
        const topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
        this.draw();
    },
    _animateZoom: function (e: L.ZoomAnimEvent) {
        const scale = this._map.getZoomScale(e.zoom, this._map.getZoom());
        const offset = this._map._latLngToNewLayerPoint(this._map.getBounds().getNorthWest(), e.zoom, e.center);
        L.DomUtil.setTransform(this._canvas, offset, scale);
    },
    draw: function() {
        // This method should be overridden by the user
    }
});

L.canvasLayer = function () {
    return new (L.CanvasLayer as any)();
};

export default HeatmapOverlay;

// Augment the Leaflet namespace to make TypeScript aware of our custom layer
declare module 'leaflet' {
    export function canvasLayer(): any;
}
