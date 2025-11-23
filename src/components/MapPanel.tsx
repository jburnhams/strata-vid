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

interface MapPanelProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  geoJson?: FeatureCollection<Geometry, GeoJsonProperties>;
  gpxPoints?: GpxPoint[];
  currentTime?: number; // Current video time in seconds
  syncOffset?: number; // Offset in ms between video time 0 and GPX time

  // Styling
  mapStyle?: 'osm' | 'mapbox' | 'satellite';
  trackStyle?: {
    color: string;
    weight: number;
    opacity: number;
  };
  markerStyle?: {
    color: string;
    type?: 'dot' | 'pin';
  };
}

const TILE_PROVIDERS = {
    osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    mapbox: {
        // Fallback to OSM as we don't have a token, but structure is here
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
};

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
  syncOffset = 0,
  markerStyle
}: {
  gpxPoints: GpxPoint[],
  currentTime: number,
  syncOffset: number,
  markerStyle?: { color: string; type?: 'dot' | 'pin' }
}) => {
  const map = useMap();

  const position = useMemo(() => {
    if (!gpxPoints || gpxPoints.length === 0) return null;

    // syncOffset is the GPX timestamp (ms) that corresponds to Video Time 0.
    // If not provided, we default to the first point's time (essentially starting at the beginning).
    const baseTime = syncOffset || (gpxPoints[0].time);
    const targetTime = baseTime + (currentTime * 1000);

    return getCoordinateAtTime(gpxPoints, targetTime);
  }, [gpxPoints, currentTime, syncOffset]);

  const customIcon = useMemo(() => {
      const color = markerStyle?.color || 'red';
      const type = markerStyle?.type || 'dot';

      if (type === 'dot') {
          return L.divIcon({
            className: 'current-position-marker',
            html: `<div style="width: 12px; height: 12px; background-color: ${color}; border: 2px solid white; border-radius: 50%;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
      } else {
          // Default pin, maybe colorized filter?
          return DefaultIcon;
      }
  }, [markerStyle]);

  if (!position) return null;

  return (
    <Marker position={[position.lat, position.lon]} icon={customIcon} zIndexOffset={1000}>
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
  syncOffset = 0,
  mapStyle = 'osm',
  trackStyle,
  markerStyle
}) => {
  const tileProvider = TILE_PROVIDERS[mapStyle] || TILE_PROVIDERS.osm;

  return (
    <div className={className} style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution={tileProvider.attribution}
          url={tileProvider.url}
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
            <LeafletGeoJSON
                data={geoJson as any}
                style={{
                    color: trackStyle?.color || '#007acc',
                    weight: trackStyle?.weight || 4,
                    opacity: trackStyle?.opacity || 1
                }}
            />
            <FitBounds geoJson={geoJson} />
          </>
        )}
        {gpxPoints && (
          <CurrentPositionMarker
            gpxPoints={gpxPoints}
            currentTime={currentTime}
            syncOffset={syncOffset}
            markerStyle={markerStyle}
          />
        )}
      </MapContainer>
    </div>
  );
};
