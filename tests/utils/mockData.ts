import { Asset, Clip } from '../../src/types';
import { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

export const mockGeoJson: FeatureCollection<Geometry, GeoJsonProperties> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [0, 0],
          [0, 0],
        ],
      },
    },
  ],
};

export const mockGpxAsset: Asset = {
  id: 'gpx-asset-1',
  name: 'Test GPX',
  type: 'gpx',
  src: 'test.gpx',
  geoJson: mockGeoJson,
  gpxPoints: [
    { time: 1000, lat: 0, lon: 0, ele: 10, dist: 0 },
    { time: 2000, lat: 0, lon: 0, ele: 20, dist: 100 },
    { time: 3000, lat: 0, lon: 0, ele: 15, dist: 200 },
  ],
  stats: {
    distance: { total: 200 },
    elevation: { gain: 10, loss: 5, max: 20, min: 10, average: 15 },
    time: { start: new Date(), end: new Date(), duration: 2000 },
  },
};

export const mockMapClip: Clip = {
  id: 'map-clip-1',
  assetId: 'gpx-asset-1',
  trackId: 'track-1',
  start: 0,
  duration: 10,
  offset: 0,
  type: 'map',
  properties: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    zIndex: 0,
    showElevationProfile: false,
  },
};
