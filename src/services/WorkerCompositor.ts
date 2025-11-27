import { Asset, Clip, ProjectSettings, Track, OverlayProperties, TextStyle, TrackStyle, MarkerStyle } from '../types';
import { getGpxPositionAtTime, lat2tile, lon2tile, getTileUrl, TILE_SIZE } from '../utils/mapUtils';
import { interpolateValue } from '../utils/animationUtils';
import { calculateObjectFit } from '../utils/layoutUtils';
// @ts-ignore
import { Input, BlobSource, ALL_FORMATS } from 'mediabunny';
import { Feature, LineString } from 'geojson';

export class WorkerCompositor {
  private videoPool: Map<string, any> = new Map(); // Input instance
  private imageCache: Map<string, ImageBitmap> = new Map();
  private tileCache: Map<string, ImageBitmap> = new Map();

  constructor() {}

  public async initialize(assets: Asset[]) {
    for (const asset of assets) {
      if (asset.type === 'video' && !this.videoPool.has(asset.id)) {
        if (asset.file) {
           try {
             const source = new BlobSource(asset.file);
             const input = new Input({ source, formats: ALL_FORMATS });
             this.videoPool.set(asset.id, input);
           } catch (e) {
             console.error(`Failed to init video input for ${asset.id}`, e);
           }
        }
      } else if (asset.type === 'image' && !this.imageCache.has(asset.id)) {
        try {
            // In worker, we fetch the blob URL and create ImageBitmap
            const response = await fetch(asset.src);
            const blob = await response.blob();
            const bitmap = await createImageBitmap(blob);
            this.imageCache.set(asset.id, bitmap);
        } catch (e) {
            console.error(`Failed to load image asset ${asset.id}`, e);
        }
      }
    }
  }

  public cleanup() {
    this.videoPool.forEach((input) => {
        if (input.dispose) input.dispose();
    });
    this.videoPool.clear();

    this.imageCache.forEach(bmp => bmp.close());
    this.imageCache.clear();

    this.tileCache.forEach(bmp => bmp.close());
    this.tileCache.clear();
  }

  public async renderFrame(
    ctx: OffscreenCanvasRenderingContext2D,
    time: number,
    project: { tracks: Track[]; clips: Record<string, Clip>; assets: Record<string, Asset>; settings: ProjectSettings }
  ) {
    const { width, height } = project.settings;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    for (const track of project.tracks) {
      if (track.isMuted) continue;

      const activeClips = track.clips
        .map((id) => project.clips[id])
        .filter((clip) => clip && time >= clip.start && time < clip.start + clip.duration)
        .sort((a, b) => a.start - b.start);

      for (const clip of activeClips) {
        const asset = project.assets[clip.assetId];
        if (clip.type === 'text' || asset) {
          let transitionProgress = 1;
          if (clip.transitionIn) {
            const transitionTime = time - clip.start;
            if (transitionTime < clip.transitionIn.duration) {
              transitionProgress = Math.max(0, Math.min(1, transitionTime / clip.transitionIn.duration));
            }
          }
          await this.drawClip(ctx, clip, asset, time, transitionProgress, project.assets);
        }
      }
    }
  }

  private async drawClip(
    ctx: OffscreenCanvasRenderingContext2D,
    clip: Clip,
    asset: Asset | undefined,
    globalTime: number,
    transitionProgress: number = 1,
    allAssets?: Record<string, Asset>
  ) {
    const clipRate = clip.playbackRate || 1;
    const localTime = (globalTime - clip.start) * clipRate + clip.offset;

    ctx.save();

    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;

    const getValue = (prop: keyof OverlayProperties, defaultValue: any) => {
        if (typeof defaultValue === 'number' && clip.keyframes && clip.keyframes[prop]) {
             return interpolateValue(clip.keyframes[prop], globalTime - clip.start, defaultValue);
        }
        return defaultValue;
    };

    const x = getValue('x', clip.properties.x);
    const y = getValue('y', clip.properties.y);
    const width = getValue('width', clip.properties.width);
    const height = getValue('height', clip.properties.height);
    const rotation = getValue('rotation', clip.properties.rotation);
    const opacity = getValue('opacity', clip.properties.opacity);
    const mapZoom = getValue('mapZoom', clip.properties.mapZoom);

    const w = (width / 100) * cw;
    const h = (height / 100) * ch;
    const px = (x / 100) * cw;
    const py = (y / 100) * ch;

    let effectiveOpacity = opacity;
    if (clip.transitionIn) {
      if (clip.transitionIn.type === 'crossfade' || clip.transitionIn.type === 'fade') {
        effectiveOpacity = opacity * transitionProgress;
      }
    }
    ctx.globalAlpha = effectiveOpacity;

    if (clip.properties.filter) {
      ctx.filter = clip.properties.filter;
    }

    const centerX = px + w / 2;
    const centerY = py + h / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    ctx.beginPath();
    if (clip.transitionIn && clip.transitionIn.type === 'wipe') {
      const visibleWidth = w * transitionProgress;
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
            await this.drawMap(ctx, clip, asset, localTime, w, h, allAssets, mapZoom);
        }
    } catch (e) {
        console.error(`Error drawing clip ${clip.id}`, e);
    }

    ctx.restore();
  }

  private async drawVideo(
    ctx: OffscreenCanvasRenderingContext2D,
    clip: Clip,
    asset: Asset,
    time: number,
    dstW: number,
    dstH: number
  ) {
    const input = this.videoPool.get(asset.id);
    if (!input) return;

    // TODO: Verify mediabunny Input API for getting a frame at specific time
    // Assuming input.getFrame(time) exists and returns { image: ImageBitmap | VideoFrame }
    // If not, we might need a workaround.
    try {
        // @ts-ignore
        const frameData = await input.getFrame(time);
        if (frameData && frameData.image) {
             const image = frameData.image; // ImageBitmap or VideoFrame
             const srcW = image.displayWidth || image.width;
             const srcH = image.displayHeight || image.height;

             const { dw, dh, dx, dy } = calculateObjectFit(srcW, srcH, dstW, dstH, 'cover');
             ctx.drawImage(image, dx, dy, dw, dh);

             // Close frame if needed? Depends on API.
             if (image.close) image.close();
        }
    } catch (e) {
        // Fallback or ignore
    }
  }

  private drawImage(
    ctx: OffscreenCanvasRenderingContext2D,
    asset: Asset,
    dstW: number,
    dstH: number
  ) {
      const img = this.imageCache.get(asset.id);
      if (!img) return;

      const { dw, dh, dx, dy } = calculateObjectFit(img.width, img.height, dstW, dstH, 'contain');
      ctx.drawImage(img, dx, dy, dw, dh);
  }

  private drawText(
      ctx: OffscreenCanvasRenderingContext2D,
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
      ctx.textBaseline = 'middle';

      let x = 0;
      if (style.textAlign === 'left') x = -dstW / 2;
      else if (style.textAlign === 'right') x = dstW / 2;

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

      const totalTextHeight = lines.length * lineHeight;
      let startY = -totalTextHeight / 2 + lineHeight / 2;

      for (const line of lines) {
          ctx.fillText(line, x, startY);
          startY += lineHeight;
      }
  }

  private async drawMap(
    ctx: OffscreenCanvasRenderingContext2D,
    clip: Clip,
    asset: Asset,
    time: number,
    dstW: number,
    dstH: number,
    allAssets?: Record<string, Asset>,
    zoomOverride?: number
  ) {
    if (!asset.geoJson) return;

    const zoom = zoomOverride !== undefined ? zoomOverride : (clip.properties.mapZoom || 13);
    const props = asset.geoJson.features[0].properties;
    const startTime = props && props.coordTimes ? new Date(props.coordTimes[0]).getTime() : 0;
    const syncBase = clip.syncOffset !== undefined ? clip.syncOffset : startTime;
    const targetTimestamp = syncBase + (time * 1000);
    const offsetSeconds = (targetTimestamp - startTime) / 1000;

    const center = getGpxPositionAtTime(asset.geoJson.features[0] as Feature<LineString>, offsetSeconds);

    if (!center) return;

    const [lon, lat] = center;
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

    const minTx = Math.floor(viewLeft / TILE_SIZE);
    const maxTx = Math.floor(viewRight / TILE_SIZE);
    const minTy = Math.floor(viewTop / TILE_SIZE);
    const maxTy = Math.floor(viewBottom / TILE_SIZE);

    const promises: Promise<{ img: ImageBitmap; x: number; y: number } | null>[] = [];

    for (let tx = minTx; tx <= maxTx; tx++) {
        for (let ty = minTy; ty <= maxTy; ty++) {
            promises.push(this.loadTile(tx, ty, zoom).then(img => img ? { img, x: tx, y: ty } : null));
        }
    }

    const tiles = await Promise.all(promises);

    for (const tile of tiles) {
        if (!tile) continue;
        const { img, x, y } = tile;
        const tilePx = x * TILE_SIZE;
        const tilePy = y * TILE_SIZE;
        const drawX = tilePx - viewLeft - halfW;
        const drawY = tilePy - viewTop - halfH;
        ctx.drawImage(img, drawX, drawY, TILE_SIZE, TILE_SIZE);
    }

    this.drawGpxPath(ctx, clip.properties.trackStyle, asset.geoJson, zoom, viewLeft, viewTop, halfW, halfH);
    this.drawMarker(ctx, clip.properties.markerStyle, 0, 0);

    if (clip.extraTrackAssets && allAssets) {
        for (const extra of clip.extraTrackAssets) {
            const extraAsset = allAssets[extra.assetId];
            if (extraAsset && extraAsset.geoJson) {
                const extraProps = extraAsset.geoJson.features[0].properties;
                const extraStartTime = extraProps && extraProps.coordTimes ? new Date(extraProps.coordTimes[0]).getTime() : 0;
                const extraSyncBase = extra.syncOffset !== undefined ? extra.syncOffset : extraStartTime;
                const extraTargetTimestamp = extraSyncBase + (time * 1000);
                const extraOffsetSeconds = (extraTargetTimestamp - extraStartTime) / 1000;
                const extraPos = getGpxPositionAtTime(extraAsset.geoJson.features[0] as Feature<LineString>, extraOffsetSeconds);

                this.drawGpxPath(ctx, extra.trackStyle, extraAsset.geoJson, zoom, viewLeft, viewTop, halfW, halfH);

                if (extraPos) {
                    const [exLon, exLat] = extraPos;
                    const exTx = lon2tile(exLon, zoom);
                    const exTy = lat2tile(exLat, zoom);
                    const exPx = exTx * TILE_SIZE;
                    const exPy = exTy * TILE_SIZE;
                    const exDrawX = exPx - viewLeft - halfW;
                    const exDrawY = exPy - viewTop - halfH;
                    this.drawMarker(ctx, extra.markerStyle, exDrawX, exDrawY);
                }
            }
        }
    }
  }

  private loadTile(x: number, y: number, z: number): Promise<ImageBitmap | null> {
      const url = getTileUrl(x, y, z);
      const cacheKey = url; // or `${x}/${y}/${z}`
      if (this.tileCache.has(cacheKey)) {
          return Promise.resolve(this.tileCache.get(cacheKey)!);
      }
      return fetch(url)
        .then(res => {
            if (!res.ok) throw new Error('Fetch failed');
            return res.blob();
        })
        .then(blob => createImageBitmap(blob))
        .then(bmp => {
            this.tileCache.set(cacheKey, bmp);
            return bmp;
        })
        .catch(() => null);
  }

  private drawGpxPath(
      ctx: OffscreenCanvasRenderingContext2D,
      style: TrackStyle | undefined,
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

      ctx.strokeStyle = style?.color || '#ff0000';
      ctx.lineWidth = style?.weight || 4;
      ctx.globalAlpha = style?.opacity !== undefined ? style.opacity : 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

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
      ctx.stroke();
      ctx.globalAlpha = 1;
  }

  private drawMarker(
      ctx: OffscreenCanvasRenderingContext2D,
      style: MarkerStyle | undefined,
      x: number,
      y: number
  ) {
      const color = style?.color || 'blue';
      const type = style?.type || 'dot';

      if (type === 'dot') {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
      } else {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.arc(x, y - 10, 10, 0, Math.PI * 2);
          ctx.fill();
      }
  }
}
