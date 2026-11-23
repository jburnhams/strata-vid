/**
 * Reading the preview's map (strata-react's RouteMap, drawn for real by Leaflet in jsdom) the way a
 * test can: its text alternative, and the tiles it asked for. The view is held centred on the runner
 * at the clip's zoom, so the tile under the runner says where the runner is.
 */
import { screen } from '@testing-library/react';
import { lat2tile, lon2tile } from '../../src/utils/mapUtils';

/** The map's text alternative: each route, its length, and how far along each runner is. */
export function mapText(): string {
  const map = screen.getByLabelText('Map clip');
  return document.getElementById(map.getAttribute('aria-describedby') ?? '')?.textContent ?? '';
}

/** The addresses of the tiles the map has asked for. */
export function tileUrls(): string[] {
  return [...document.querySelectorAll('img.leaflet-tile')].map((img) => img.getAttribute('src') ?? '');
}

/** The `z/x/y` of the tile that holds a place. */
export function tileOf(lat: number, lon: number, zoom = 13): string {
  return `${zoom}/${Math.floor(lon2tile(lon, zoom))}/${Math.floor(lat2tile(lat, zoom))}`;
}

/** Whether the map has asked for the tile that holds a place. */
export const showsTileOf = (lat: number, lon: number, zoom = 13) => tileUrls().some((url) => url.includes(`/${tileOf(lat, lon, zoom)}.`));
