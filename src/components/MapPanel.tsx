import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON as LeafletGeoJSON, useMap } from 'react-leaflet';
import { LatLngExpression, GeoJSON as LGeoJSON } from 'leaflet';
import L from 'leaflet';
import ElevationProfile from './preview/ElevationProfile';
import HeatmapOverlay from './preview/HeatmapOverlay';
import { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { GpxPoint, TrackStyle, MarkerStyle, Asset, ExtraTrack } from '../types';
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

export interface MapTrackData {
  geoJson?: FeatureCollection<Geometry, GeoJsonProperties>;
  gpxPoints?: GpxPoint[];
  syncOffset?: number;
  trackStyle?: TrackStyle;
  markerStyle?: MarkerStyle;
}

interface MapPanelProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  currentTime?: number; // Current video time in seconds

  // Multiple tracks support
  tracks?: MapTrackData[];

  // Legacy/Single track props (mapped to first track if 'tracks' not provided)
  geoJson?: FeatureCollection<Geometry, GeoJsonProperties>;
  gpxPoints?: GpxPoint[];
  syncOffset?: number; // Offset in ms between video time 0 and GPX time

  // Styling
  mapStyle?: 'osm' | 'mapbox' | 'satellite' | 'dark' | 'custom';
  customMapStyleUrl?: string;
  trackStyle?: TrackStyle;
  markerStyle?: MarkerStyle;

// Heatmap
  heatmapPoints?: GpxPoint[];
  heatmapDataSource?: 'speed' | 'elevation';

  // Elevation Profile
  showElevationProfile?: boolean;
  onToggleElevationProfile?: () => void;
  onSeek?: (time: number) => void;

  // Data for ElevationProfile
  gpxAssets?: (Asset | undefined)[];
  mainAssetId?: string;
  extraTracks?: ExtraTrack[];
  clipDuration?: number;
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
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    custom: {
        url: '', // This will be replaced by the customMapStyleUrl prop
        attribution: 'Custom Tile Layer'
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
  markerStyle?: MarkerStyle
}) => {

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
  currentTime = 0,
  mapStyle = 'osm',
  customMapStyleUrl,

  tracks,

// Legacy props
  geoJson,
  gpxPoints,
  syncOffset = 0,
  trackStyle,
  markerStyle,
  heatmapPoints,
  heatmapDataSource,

  // Elevation Profile props
  showElevationProfile,
  onToggleElevationProfile,
  onSeek,
  gpxAssets = [],
  mainAssetId = '',
  extraTracks = [],
  clipDuration = 0
}) => {
  const tileProvider = useMemo(() => {
    const provider = TILE_PROVIDERS[mapStyle] || TILE_PROVIDERS.osm;
    if (mapStyle === 'custom' && customMapStyleUrl) {
      return { ...provider, url: customMapStyleUrl };
    }
    return provider;
  }, [mapStyle, customMapStyleUrl]);

  // normalize tracks
  const effectiveTracks = useMemo(() => {
      if (tracks && tracks.length > 0) return tracks;

      // Fallback to legacy props if valid
      if (geoJson || gpxPoints) {
          return [{
              geoJson,
              gpxPoints,
              syncOffset,
              trackStyle,
              markerStyle
          }];
      }
      return [];
  }, [tracks, geoJson, gpxPoints, syncOffset, trackStyle, markerStyle]);

  // Determine primary track for bounds fitting (use first one)
  const primaryTrack = effectiveTracks.length > 0 ? effectiveTracks[0] : null;

  return (
    <div className={`${className} flex flex-col`} style={{ height: '100%', width: '100%' }}>
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

          {effectiveTracks.length === 0 && (
            <Marker position={center}>
              <Popup>
                Default Marker
              </Popup>
            </Marker>
          )}

          {effectiveTracks.map((track, index) => (
              <React.Fragment key={index}>
                  {track.geoJson && (
                      <LeafletGeoJSON
                          data={track.geoJson as any}
                          style={{
                              color: track.trackStyle?.color || '#007acc',
                              weight: track.trackStyle?.weight || 4,
                              opacity: track.trackStyle?.opacity || 1
                          }}
                      />
                  )}
                  {track.gpxPoints && (
                    <CurrentPositionMarker
                      gpxPoints={track.gpxPoints}
                      currentTime={currentTime}
                      syncOffset={track.syncOffset || 0}
                      markerStyle={track.markerStyle}
                    />
                  )}
              </React.Fragment>
          ))}

          {primaryTrack && primaryTrack.geoJson && (
              <FitBounds geoJson={primaryTrack.geoJson} />
          )}

          {heatmapPoints && <HeatmapOverlay points={heatmapPoints} dataSource={heatmapDataSource} />}

          {onToggleElevationProfile && (
            <div className="leaflet-top leaflet-right">
              <div className="leaflet-control leaflet-bar">
                <a
                  className={`elevation-toggle ${showElevationProfile ? 'active' : ''}`}
                  href="#"
                  title="Toggle Elevation Profile"
                  onClick={(e) => { e.preventDefault(); onToggleElevationProfile(); }}
                >
                  🏔️
                </a>
              </div>
            </div>
          )}
        </MapContainer>
      {showElevationProfile && onSeek && (
        <div style={{ flex: '0 0 auto', height: '120px' }}>
          <ElevationProfile
            gpxAssets={gpxAssets}
            mainAssetId={mainAssetId}
            extraTracks={extraTracks}
            onSeek={onSeek}
            currentTime={currentTime}
            clipDuration={clipDuration}
          />
        </div>
      )}
    </div>
  );
};
