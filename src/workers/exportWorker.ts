import { WorkerCompositor } from '../services/WorkerCompositor';
// @ts-ignore
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource } from 'mediabunny';

const compositor = new WorkerCompositor();
let isCancelled = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'cancel') {
    isCancelled = true;
  } else if (type === 'start') {
    isCancelled = false;
    try {
        await runExport(payload);
    } catch (err: any) {
        console.error('Export worker error:', err);
        self.postMessage({ type: 'error', error: err.message || 'Unknown worker error' });
    }
  }
};

async function runExport(payload: any) {
    const { project, exportSettings } = payload;
    const { width, height, fps, videoBitrate } = exportSettings;
    const duration = project.settings.duration;
    const totalFrames = Math.ceil(duration * fps);

    // 1. Initialize Compositor
    self.postMessage({ type: 'progress', progress: { currentFrame: 0, totalFrames, percentage: 0, status: 'initializing' } });

    // Convert assets dict to array for initialization
    const assetList = Object.values(project.assets);
    await compositor.initialize(assetList as any[]);

    if (isCancelled) return;

    // 2. Setup Mediabunny Output
    const output = new Output({
        format: new Mp4OutputFormat(),
        target: new BufferTarget(),
    });

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as OffscreenCanvasRenderingContext2D;

    if (!ctx) throw new Error('Failed to create worker canvas context');

    // @ts-ignore
    const videoSource = new CanvasSource(canvas, {
        codec: 'avc',
        // @ts-ignore
        framerate: fps, // mediabunny sometimes uses lowercase
        bitrate: videoBitrate || 6_000_000,
    });

    output.addVideoTrack(videoSource);
    await output.start();

    // 3. Render Loop
    const orderedTracks = project.trackOrder.map((id: string) => project.tracks[id]).filter(Boolean);
    const renderProjectState = {
        tracks: orderedTracks,
        clips: project.clips,
        assets: project.assets,
        settings: project.settings
    };

    for (let frame = 0; frame < totalFrames; frame++) {
        if (isCancelled) {
            self.postMessage({ type: 'progress', progress: { status: 'cancelled' } });
            compositor.cleanup();
            return;
        }

        const time = frame / fps;

        await compositor.renderFrame(ctx, time, renderProjectState);

        // Add frame
        // @ts-ignore
        if (videoSource.addFrame) {
             // @ts-ignore
             await videoSource.addFrame(canvas);
        } else {
             // @ts-ignore
             await videoSource.add(time);
        }

        if (frame % 10 === 0 || frame === totalFrames - 1) {
            self.postMessage({
                type: 'progress',
                progress: {
                    currentFrame: frame + 1,
                    totalFrames,
                    percentage: Math.round(((frame + 1) / totalFrames) * 100),
                    status: 'rendering'
                }
            });
        }
    }

    self.postMessage({ type: 'progress', progress: { currentFrame: totalFrames, totalFrames, percentage: 100, status: 'encoding' } });

    await output.finalize();
    compositor.cleanup();

    if (isCancelled) {
         self.postMessage({ type: 'progress', progress: { status: 'cancelled' } });
         return;
    }

    // @ts-ignore
    const buffer = output.target.buffer;
    const blobPart = buffer || new ArrayBuffer(0);
    const blob = new Blob([blobPart as BlobPart], { type: 'video/mp4' });

    self.postMessage({ type: 'complete', blob });
}
