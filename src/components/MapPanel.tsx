import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON as LeafletGeoJSON, useMap } from 'react-leaflet';
import { LatLngExpression, GeoJSON as LGeoJSON } from 'leaflet';
import L from 'leaflet';
import { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

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

export const MapPanel: React.FC<MapPanelProps> = ({
  center = [51.505, -0.09],
  zoom = 13,
  className,
  geoJson
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
      </MapContainer>
    </div>
  );
};
