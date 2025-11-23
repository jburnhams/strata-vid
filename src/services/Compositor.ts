import { Asset, Clip, ProjectSettings, Track } from '../types';
import { getGpxPositionAtTime, lat2tile, lon2tile, getTileUrl, TILE_SIZE, tile2lon, tile2lat } from '../utils/mapUtils';
import { Feature, LineString } from 'geojson';

export class Compositor {
  private videoPool: Map<string, HTMLVideoElement> = new Map();
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private tileCache: Map<string, HTMLImageElement> = new Map();

  constructor() {}

  public async initialize(assets: Asset[]) {
    // Pre-load video elements
    for (const asset of assets) {
      if (asset.type === 'video' && !this.videoPool.has(asset.id)) {
        const video = document.createElement('video');
        video.src = asset.src;
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        // Wait for metadata to ensure duration etc (optional but good)
        // We don't await here to avoid blocking, but for export we might need to.
        // For now, just create.
        this.videoPool.set(asset.id, video);
      }
    }
  }

  public cleanup() {
    this.videoPool.forEach((v) => {
      v.src = '';
      v.remove();
    });
    this.videoPool.clear();
    this.imageCache.clear();
    // Tile cache could be large, strictly we should clear it.
    this.tileCache.clear();
  }

  public async renderFrame(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    time: number,
    project: { tracks: Track[]; clips: Record<string, Clip>; assets: Record<string, Asset>; settings: ProjectSettings }
  ) {
    const { width, height } = project.settings;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Sort tracks by order (if needed, usually array order is bottom-to-top or top-to-bottom)
    // Assuming tracks array is ordered bottom-to-top (first drawn first)
    // If not, we might need to reverse. Usually UI stack: Top track is on top.
    // So we iterate tracks in reverse order? Or standard order?
    // In typical timeline, Track 1 is top. Track N is bottom.
    // If tracks[0] is top, we should draw tracks[N] first.
    // Let's assume tracks[0] is the top-most visual layer. So we draw in reverse.
    const tracksToDraw = [...project.tracks].reverse();

    for (const track of tracksToDraw) {
      if (track.isMuted) continue; // Muted tracks (visual?) usually "Mute" means audio. "Hide" is visual.
      // Assuming isMuted only affects audio for now. But if it implies "Disabled", we skip.
      // Let's assume we draw everything unless hidden. There is no isHidden in Track type.

      // Find active clip
      const activeClipId = track.clips.find((id) => {
        const clip = project.clips[id];
        return clip && time >= clip.start && time < clip.start + clip.duration;
      });

      if (activeClipId) {
        const clip = project.clips[activeClipId];
        const asset = project.assets[clip.assetId];
        if (asset) {
          await this.drawClip(ctx, clip, asset, time);
        }
      }
    }
  }

  private async drawClip(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    clip: Clip,
    asset: Asset,
    globalTime: number
  ) {
    const localTime = globalTime - clip.start + clip.offset;

    if (clip.type === 'video' && asset.type === 'video') {
      await this.drawVideo(ctx, clip, asset, localTime);
    } else if (clip.type === 'map' && asset.type === 'gpx') {
      await this.drawMap(ctx, clip, asset, localTime);
    }
    // TODO: Handle image, text, html
  }

  private async drawVideo(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    clip: Clip,
    asset: Asset,
    time: number
  ) {
    const video = this.videoPool.get(asset.id);
    if (!video) return;

    // Seek
    // We need to handle the case where time is same as last frame to avoid unnecessary seek?
    // But for export, we assume sequential access.
    // Seek tolerance is tricky.

    if (Math.abs(video.currentTime - time) > 0.05) {
        video.currentTime = time;
        await new Promise<void>((resolve) => {
            const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                resolve();
            };
            video.addEventListener('seeked', onSeeked, { once: true });
        });
    }

    // Transform
    this.applyTransform(ctx, clip);

    // Draw
    // By default draw full video to canvas? Or respect clip dimensions?
    // Usually "fit" or "fill". Assuming fill or using clip properties.
    // Clip properties has width/height in %?
    // "width: number; // % of screen width"
    // We need to convert % to pixels.
    const { width: pW, height: pH } = clip.properties;
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    const w = (pW / 100) * canvasWidth;
    const h = (pH / 100) * canvasHeight;

    // Default video draw: drawImage(video, 0, 0, videoWidth, videoHeight, x, y, w, h)
    // We assume 0,0 is origin after transform?
    // No, applyTransform usually translates to x,y.

    ctx.drawImage(video, -w/2, -h/2, w, h); // Draw centered at origin (handled by transform)

    // Restore
    ctx.resetTransform();
  }

  private applyTransform(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    clip: Clip
  ) {
    const { x, y, rotation, width, height } = clip.properties;
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;

    const px = (x / 100) * cw;
    const py = (y / 100) * ch;

    // Translate to center of clip
    // Actually properties x,y usually define top-left or center?
    // Let's assume center for rotation.
    // If x,y is top-left, we need to offset.
    // Let's assume x,y is center position.

    // Wait, OverlayProperties: "x: number; // % of screen width".
    // If standard CSS, it's top-left.
    // But for rotation, we want to rotate around center.
    // Let's translate to x + w/2, y + h/2
    const w = (width / 100) * cw;
    const h = (height / 100) * ch;

    const centerX = px + w / 2;
    const centerY = py + h / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
  }

  private async drawMap(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    clip: Clip,
    asset: Asset,
    time: number
  ) {
    if (!asset.geoJson) return;

    // 1. Get current position
    // Map overlay logic:
    // Usually shows the path and a marker at current position.
    // Center map at current position.

    // Map rendering requires projecting standard web mercator tiles.
    const zoom = 13; // Fixed zoom for now

    // Find center
    // We assume the map is centered on the current GPX point.
    // time is local time in seconds.
    const center = getGpxPositionAtTime(asset.geoJson.features[0] as Feature<LineString>, time);
    if (!center) return; // Should allow fallback?

    const [lon, lat] = center;

    // Calculate bounds in Tile Space
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;

    // Clip dimensions
    const w = (clip.properties.width / 100) * cw;
    const h = (clip.properties.height / 100) * ch;

    this.applyTransform(ctx, clip);

    // Now we are at center of clip area.
    // We want to draw the map into [-w/2, -h/2, w, h] rectangle.
    // Create a clipping region?
    ctx.beginPath();
    ctx.rect(-w/2, -h/2, w, h);
    ctx.clip();

    // Draw background (or tiles)
    // Calculate tile coordinates for the center
    const centerTx = lon2tile(lon, zoom);
    const centerTy = lat2tile(lat, zoom);

    // Pixel coordinates of center in "World Pixel Space" (at this zoom)
    const centerPx = centerTx * TILE_SIZE;
    const centerPy = centerTy * TILE_SIZE;

    // Viewport relative to World Pixel Space
    const halfW = w / 2;
    const halfH = h / 2;

    const viewLeft = centerPx - halfW;
    const viewTop = centerPy - halfH;
    const viewRight = centerPx + halfW;
    const viewBottom = centerPy + halfH;

    // Determine tile range
    const minTx = Math.floor(viewLeft / TILE_SIZE);
    const maxTx = Math.floor(viewRight / TILE_SIZE);
    const minTy = Math.floor(viewTop / TILE_SIZE);
    const maxTy = Math.floor(viewBottom / TILE_SIZE);

    const tilesToLoad: Promise<{ img: HTMLImageElement; x: number; y: number }>[] = [];

    for (let tx = minTx; tx <= maxTx; tx++) {
      for (let ty = minTy; ty <= maxTy; ty++) {
         tilesToLoad.push(this.loadTile(tx, ty, zoom).then(img => ({ img, x: tx, y: ty })));
      }
    }

    const tiles = await Promise.all(tilesToLoad);

    // Draw Tiles
    for (const { img, x, y } of tiles) {
       // Position of tile in World Pixels
       const tilePx = x * TILE_SIZE;
       const tilePy = y * TILE_SIZE;

       // Position relative to Viewport Top-Left
       const drawX = tilePx - viewLeft - halfW; // -halfW because we are drawing relative to center (0,0) in canvas context
       const drawY = tilePy - viewTop - halfH;

       ctx.drawImage(img, drawX, drawY, TILE_SIZE, TILE_SIZE);
    }

    // Draw Path
    await this.drawGpxPath(ctx, asset.geoJson, zoom, viewLeft, viewTop, halfW, halfH);

    // Draw Marker
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2); // Center is 0,0 because we centered the view there
    ctx.fill();

    ctx.resetTransform();
  }

  private loadTile(x: number, y: number, z: number): Promise<HTMLImageElement> {
    const url = getTileUrl(x, y, z);
    if (this.tileCache.has(url)) {
        return Promise.resolve(this.tileCache.get(url)!);
    }
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.tileCache.set(url, img);
            resolve(img);
        };
        img.onerror = () => {
            // Return empty image or placeholder?
            // Resolve with empty to avoid crashing render
            resolve(img);
        };
        img.src = url;
    });
  }

  private async drawGpxPath(
      ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
      geoJson: any,
      zoom: number,
      viewLeft: number,
      viewTop: number,
      halfW: number,
      halfH: number
  ) {
      if (!geoJson || !geoJson.features) return;

      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.beginPath();

      const feature = geoJson.features[0]; // Assuming one track
      if (feature.geometry.type === 'LineString') {
          const coords = feature.geometry.coordinates;
          let first = true;
          for (const [lon, lat] of coords) {
              const tx = lon2tile(lon, zoom);
              const ty = lat2tile(lat, zoom);

              const px = tx * TILE_SIZE;
              const py = ty * TILE_SIZE;

              const drawX = px - viewLeft - halfW;
              const drawY = py - viewTop - halfH;

              if (first) {
                  ctx.moveTo(drawX, drawY);
                  first = false;
              } else {
                  ctx.lineTo(drawX, drawY);
              }
          }
      }
      ctx.stroke();
  }
}
