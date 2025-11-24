import { Asset, Clip, ProjectSettings, Track, TextStyle } from '../types';
import { getGpxPositionAtTime, lat2tile, lon2tile, getTileUrl, TILE_SIZE } from '../utils/mapUtils';
import { Feature, LineString } from 'geojson';

export class Compositor {
  private videoPool: Map<string, HTMLVideoElement> = new Map();
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private tileCache: Map<string, HTMLImageElement> = new Map();

  constructor() {}

  public async initialize(assets: Asset[]) {
    // Pre-load video elements and images
    for (const asset of assets) {
      if (asset.type === 'video' && !this.videoPool.has(asset.id)) {
        const video = document.createElement('video');
        video.src = asset.src;
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        // Trigger load
        video.load();
        this.videoPool.set(asset.id, video);
      } else if (asset.type === 'image' && !this.imageCache.has(asset.id)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        // Wait for load to ensure dimensions are available
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => {
            console.warn(`Failed to load image asset ${asset.id}`);
            resolve();
          };
          img.src = asset.src;
        });
        this.imageCache.set(asset.id, img);
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

    // Tracks are ordered bottom-to-top in the array passed here (assumed processed by caller)
    // If caller passes raw store tracks array?
    // In ExportManager: `const orderedTracks = project.trackOrder.map(id => project.tracks[id]).filter(Boolean);`
    // This produces an array where index 0 is bottom, index N is top (based on typical store logic).
    // So we iterate normally.

    for (const track of project.tracks) {
      if (track.isMuted) continue;

      // Find all active clips (handling overlapping transitions)
      const activeClips = track.clips
        .map((id) => project.clips[id])
        .filter((clip) => clip && time >= clip.start && time < clip.start + clip.duration)
        .sort((a, b) => a.start - b.start);

      for (const clip of activeClips) {
        const asset = project.assets[clip.assetId];
        // Text clips might not have an asset, but others must
        if (clip.type === 'text' || asset) {
          // Calculate transition progress
          let transitionProgress = 1;
          if (clip.transitionIn) {
            const transitionTime = time - clip.start;
            if (transitionTime < clip.transitionIn.duration) {
              transitionProgress = Math.max(0, Math.min(1, transitionTime / clip.transitionIn.duration));
            }
          }
          await this.drawClip(ctx, clip, asset, time, transitionProgress);
        }
      }
    }
  }

  private async drawClip(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    clip: Clip,
    asset: Asset | undefined,
    globalTime: number,
    transitionProgress: number = 1
  ) {
    const localTime = globalTime - clip.start + clip.offset;

    // Save context state
    ctx.save();

    // 1. Calculate dimensions and transform
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;

    const { x, y, width, height, rotation, opacity } = clip.properties;

    // Convert % to pixels
    const w = (width / 100) * cw;
    const h = (height / 100) * ch;
    const px = (x / 100) * cw;
    const py = (y / 100) * ch;

    // Apply Opacity (Transition)
    let effectiveOpacity = opacity;
    if (clip.transitionIn) {
      if (clip.transitionIn.type === 'crossfade' || clip.transitionIn.type === 'fade') {
        effectiveOpacity = opacity * transitionProgress;
      }
    }
    ctx.globalAlpha = effectiveOpacity;

    // Apply Transform: Translate to center of clip, then rotate
    const centerX = px + w / 2;
    const centerY = py + h / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    // Clip to bounding box (overflow: hidden)
    // The drawing area is now centered at (0,0) with size (w, h)
    ctx.beginPath();

    // Handle Wipe Transition
    if (clip.transitionIn && clip.transitionIn.type === 'wipe') {
      const visibleWidth = w * transitionProgress;
      // Wipe left to right
      ctx.rect(-w / 2, -h / 2, visibleWidth, h);
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }

    ctx.clip();

    try {
        if (clip.type === 'video' && asset && asset.type === 'video') {
            await this.drawVideo(ctx, clip, asset, localTime, w, h);
        } else if (clip.type === 'image' && asset && asset.type === 'image') {
            this.drawImage(ctx, asset, w, h);
        } else if (clip.type === 'text') {
            this.drawText(ctx, clip, w, h);
        } else if (clip.type === 'map' && asset && asset.type === 'gpx') {
            await this.drawMap(ctx, clip, asset, localTime, w, h);
        }
    } catch (e) {
        console.error(`Error drawing clip ${clip.id}`, e);
    }

    ctx.restore();
  }

  private async drawVideo(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    clip: Clip,
    asset: Asset,
    time: number,
    dstW: number,
    dstH: number
  ) {
    const video = this.videoPool.get(asset.id);
    if (!video) return;

    // Seek logic
    // We check if we need to seek. For export, frames are sequential, but time might jump if clips are non-contiguous.
    // Use a very small threshold to ensure every frame is rendered accurately (frame time at 60fps is ~0.016s)
    if (Math.abs(video.currentTime - time) > 0.001) {
        video.currentTime = time;
        // Wait for seeked
        await new Promise<void>((resolve) => {
            const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                resolve();
            };
            // If it's already ready (rare in this loop but possible), resolve immediately?
            // Safer to just wait for event.
            video.addEventListener('seeked', onSeeked, { once: true });
        });
    }

    // Object Fit: Cover
    // Calculate scaling to cover dstW, dstH
    const srcW = video.videoWidth || 1280; // Fallback
    const srcH = video.videoHeight || 720;

    const { dw, dh, dx, dy } = this.calculateObjectFit(srcW, srcH, dstW, dstH, 'cover');

    ctx.drawImage(video, dx, dy, dw, dh);
  }

  private drawImage(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    asset: Asset,
    dstW: number,
    dstH: number
  ) {
      const img = this.imageCache.get(asset.id);
      if (!img) return;

      // Object Fit: Contain
      const { dw, dh, dx, dy } = this.calculateObjectFit(img.width, img.height, dstW, dstH, 'contain');

      ctx.drawImage(img, dx, dy, dw, dh);
  }

  private drawText(
      ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
      clip: Clip,
      dstW: number,
      dstH: number
  ) {
      const text = clip.content || '';
      const style = clip.textStyle || {
          fontFamily: 'Arial',
          fontSize: 24,
          fontWeight: 'bold',
          color: '#ffffff',
          textAlign: 'center'
      };

      ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
      ctx.fillStyle = style.color;
      ctx.textAlign = style.textAlign as CanvasTextAlign;
      ctx.textBaseline = 'middle'; // Vertical align center

      // X Position based on alignment
      let x = 0;
      if (style.textAlign === 'left') x = -dstW / 2;
      else if (style.textAlign === 'right') x = dstW / 2;

      // Simple word wrap
      // Since we want to center vertically, we need to know total height first.
      const lineHeight = style.fontSize * 1.2;
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const width = ctx.measureText(currentLine + ' ' + word).width;
          if (width < dstW) {
              currentLine += ' ' + word;
          } else {
              lines.push(currentLine);
              currentLine = word;
          }
      }
      lines.push(currentLine);

      // Draw lines
      const totalTextHeight = lines.length * lineHeight;
      let startY = -totalTextHeight / 2 + lineHeight / 2;

      for (const line of lines) {
          ctx.fillText(line, x, startY);
          startY += lineHeight;
      }
  }

  private async drawMap(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    clip: Clip,
    asset: Asset,
    time: number,
    dstW: number,
    dstH: number
  ) {
    if (!asset.geoJson) return;

    // Use clip zoom or default
    const zoom = clip.properties.mapZoom || 13;

    // 1. Get current position for center
    const center = getGpxPositionAtTime(asset.geoJson.features[0] as Feature<LineString>, time);
    // If no data at this time, maybe we just don't draw? Or draw last known?
    if (!center) return;

    const [lon, lat] = center;

    // Calculate view bounds in Tile Pixels (World Space at Zoom)
    const centerTx = lon2tile(lon, zoom);
    const centerTy = lat2tile(lat, zoom);
    const centerPx = centerTx * TILE_SIZE;
    const centerPy = centerTy * TILE_SIZE;

    const halfW = dstW / 2;
    const halfH = dstH / 2;

    const viewLeft = centerPx - halfW;
    const viewTop = centerPy - halfH;
    const viewRight = centerPx + halfW;
    const viewBottom = centerPy + halfH;

    // Determine tiles to load
    const minTx = Math.floor(viewLeft / TILE_SIZE);
    const maxTx = Math.floor(viewRight / TILE_SIZE);
    const minTy = Math.floor(viewTop / TILE_SIZE);
    const maxTy = Math.floor(viewBottom / TILE_SIZE);

    const promises: Promise<{ img: HTMLImageElement; x: number; y: number } | null>[] = [];

    for (let tx = minTx; tx <= maxTx; tx++) {
        for (let ty = minTy; ty <= maxTy; ty++) {
            promises.push(this.loadTile(tx, ty, zoom).then(img => img ? { img, x: tx, y: ty } : null));
        }
    }

    const tiles = await Promise.all(promises);

    // Draw Tiles
    for (const tile of tiles) {
        if (!tile) continue;
        const { img, x, y } = tile;

        const tilePx = x * TILE_SIZE;
        const tilePy = y * TILE_SIZE;

        const drawX = tilePx - viewLeft - halfW; // Relative to center (0,0)
        const drawY = tilePy - viewTop - halfH;

        ctx.drawImage(img, drawX, drawY, TILE_SIZE, TILE_SIZE);
    }

    // Draw Path
    this.drawGpxPath(ctx, clip, asset.geoJson, zoom, viewLeft, viewTop, halfW, halfH);

    // Draw Marker
    const markerColor = clip.properties.markerStyle?.color || 'blue';
    ctx.fillStyle = markerColor;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private loadTile(x: number, y: number, z: number): Promise<HTMLImageElement | null> {
      const url = getTileUrl(x, y, z);
      if (this.tileCache.has(url)) {
          return Promise.resolve(this.tileCache.get(url)!);
      }
      return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
              this.tileCache.set(url, img);
              resolve(img);
          };
          img.onerror = () => {
              // Fail silently, maybe render nothing for this tile
              resolve(null);
          };
          img.src = url;
      });
  }

  private drawGpxPath(
      ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
      clip: Clip,
      geoJson: any,
      zoom: number,
      viewLeft: number,
      viewTop: number,
      halfW: number,
      halfH: number
  ) {
      if (!geoJson || !geoJson.features) return;
      const feature = geoJson.features[0];
      if (feature.geometry.type !== 'LineString') return;

      const style = clip.properties.trackStyle;
      ctx.strokeStyle = style?.color || '#ff0000';
      ctx.lineWidth = style?.weight || 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const coords = feature.geometry.coordinates;
      let first = true;

      // Optimization: Only draw segments that are visible or close to view?
      // For now draw all (export time is less critical than runtime FPS, but still)

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
      ctx.stroke();
  }

  private calculateObjectFit(
      srcW: number,
      srcH: number,
      dstW: number,
      dstH: number,
      mode: 'contain' | 'cover'
  ) {
      const srcRatio = srcW / srcH;
      const dstRatio = dstW / dstH;
      let dw = dstW;
      let dh = dstH;

      if (mode === 'contain') {
          if (srcRatio > dstRatio) {
              dh = dstW / srcRatio;
          } else {
              dw = dstH * srcRatio;
          }
      } else { // cover
          if (srcRatio > dstRatio) {
              dw = dstH * srcRatio;
          } else {
              dh = dstW / srcRatio;
          }
      }

      return {
          dw,
          dh,
          dx: -dw / 2,
          dy: -dh / 2
      };
  }
}
