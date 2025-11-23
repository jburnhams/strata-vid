import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON as LeafletGeoJSON, useMap } from 'react-leaflet';
import { LatLngExpression, GeoJSON as LGeoJSON } from 'leaflet';
import L from 'leaflet';
import { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { GpxPoint } from '../types';
import { getCoordinateAtTime } from '../utils/gpxParser';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom marker for current position
const CurrentPositionIcon = L.divIcon({
  className: 'current-position-marker',
  html: '<div style="width: 12px; height: 12px; background-color: red; border: 2px solid white; border-radius: 50%;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface MapPanelProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  geoJson?: FeatureCollection<Geometry, GeoJsonProperties>;
  gpxPoints?: GpxPoint[];
  currentTime?: number; // Current video time in seconds
  startTime?: Date; // Start time of the GPX track (optional, if we want absolute time sync)
  syncOffset?: number; // Offset in seconds between video time and GPX time
}

const FitBounds = ({ geoJson }: { geoJson: FeatureCollection<Geometry, GeoJsonProperties> | undefined }) => {
  const map = useMap();

  useEffect(() => {
    if (geoJson) {
      // Cast to any because Leaflet's GeoJSON type definitions are slightly different from standard GeoJSON
      const leafletGeoJson = new LGeoJSON(geoJson as any);
      const bounds = leafletGeoJson.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds);
      }
    }
  }, [geoJson, map]);

  return null;
};

const CurrentPositionMarker = ({
  gpxPoints,
  currentTime,
  syncOffset = 0
}: {
  gpxPoints: GpxPoint[],
  currentTime: number,
  syncOffset: number
}) => {
  const map = useMap();

  const position = useMemo(() => {
    if (!gpxPoints || gpxPoints.length === 0) return null;

    // Calculate GPX time based on video time and offset
    // Video time is relative (seconds from 0)
    // GPX points use absolute timestamps (ms)

    // We need to know the reference start time.
    // If syncOffset is provided, it aligns video 0 with a specific GPX timestamp (or vice versa).
    // Let's assume syncOffset = gpxTimestampAtVideoStart - videoStartTime(0).
    // So gpxTime = videoTime * 1000 + syncOffset.

    // However, if no sync is established yet, we might just want to show the first point?
    // Or if we have a startTime prop?

    // Let's interpret syncOffset as the GPX timestamp (ms) that corresponds to Video Time 0.
    // If not provided, we use the first point's time.

    const baseTime = syncOffset || (gpxPoints[0].time);
    const targetTime = baseTime + (currentTime * 1000);

    return getCoordinateAtTime(gpxPoints, targetTime);
  }, [gpxPoints, currentTime, syncOffset]);

  useEffect(() => {
    if (position) {
      // Optional: Auto-pan to current position?
      // Maybe better to let user pan, unless "Follow" mode is on.
      // For now, let's not auto-pan continuously to avoid jarring UX,
      // or maybe do it if the point is out of bounds?
      // Let's keep it simple for now.
    }
  }, [position, map]);

  if (!position) return null;

  return (
    <Marker position={[position.lat, position.lon]} icon={CurrentPositionIcon} zIndexOffset={1000}>
      <Popup>
        Current Position
      </Popup>
    </Marker>
  );
};

export const MapPanel: React.FC<MapPanelProps> = ({
  center = [51.505, -0.09],
  zoom = 13,
  className,
  geoJson,
  gpxPoints,
  currentTime = 0,
  syncOffset = 0
}) => {
  return (
    <div className={className} style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!geoJson && (
          <Marker position={center}>
            <Popup>
              Default Marker
            </Popup>
          </Marker>
        )}
        {geoJson && (
          <>
            <LeafletGeoJSON data={geoJson as any} style={{ color: '#007acc', weight: 4 }} />
            <FitBounds geoJson={geoJson} />
          </>
        )}
        {gpxPoints && (
          <CurrentPositionMarker
            gpxPoints={gpxPoints}
            currentTime={currentTime}
            syncOffset={syncOffset}
          />
        )}
      </MapContainer>
    </div>
  );
};
