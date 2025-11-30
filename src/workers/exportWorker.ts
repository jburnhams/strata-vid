import { WorkerCompositor } from '../services/WorkerCompositor';
// @ts-ignore
import { Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, Input, BlobSource } from 'mediabunny';
import { createWavBlob } from '../utils/audioUtils';

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
    const { project, exportSettings, audioData } = payload;
    const { width, height, fps, videoBitrate, format, videoCodec, audioCodec, audioBitrate } = exportSettings;
    const duration = project.settings.duration;
    const totalFrames = Math.ceil(duration * fps);

    // 1. Initialize Compositor
    self.postMessage({ type: 'progress', progress: { currentFrame: 0, totalFrames, percentage: 0, status: 'initializing' } });

    // Convert assets dict to array for initialization
    const assetList = Object.values(project.assets);
    await compositor.initialize(assetList as any[]);

    if (isCancelled) {
        self.postMessage({ type: 'progress', progress: { status: 'cancelled' } });
        return;
    }

    // 2. Setup Mediabunny Output
    // Default to MP4 if not specified
    const outputFormat = format === 'webm' ? new WebMOutputFormat() : new Mp4OutputFormat();

    const output = new Output({
        format: outputFormat,
        target: new BufferTarget(),
    });

    // Setup Video
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as OffscreenCanvasRenderingContext2D;

    if (!ctx) throw new Error('Failed to create worker canvas context');

    // @ts-ignore
    const videoSource = new CanvasSource(canvas, {
        codec: videoCodec || 'avc',
        // @ts-ignore
        framerate: fps, // mediabunny sometimes uses lowercase
        bitrate: videoBitrate || 6_000_000,
    });

    output.addVideoTrack(videoSource);

    // Setup Audio
    let audioInput: any = null;
    if (audioData) {
        try {
            const wavBlob = createWavBlob(audioData.channels, audioData.sampleRate);
            const source = new BlobSource(wavBlob);
            // @ts-ignore
            audioInput = new Input({ source });

            const tracks = await audioInput.getAudioTracks();
            if (tracks && tracks.length > 0) {
                const track = tracks[0];
                const audioOptions: any = {};

                // Only pass options if they are explicitly set
                if (audioCodec) audioOptions.codec = audioCodec;
                if (audioBitrate) audioOptions.bitrate = audioBitrate;

                // addAudioTrack(track, options) is the expected API for transcoding
                output.addAudioTrack(track, audioOptions);
            } else {
                console.warn('No audio tracks found in generated WAV');
            }
        } catch (e) {
            console.warn('Failed to add audio track to export', e);
        }
    }

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
    // Determine MIME type based on format
    const mimeType = format === 'webm' ? 'video/webm' : 'video/mp4';
    const blob = new Blob([blobPart as BlobPart], { type: mimeType });

    self.postMessage({ type: 'complete', blob });
}
