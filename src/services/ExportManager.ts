import { Asset, Clip, ProjectSettings, Track } from '../types';
import { Compositor } from './Compositor';
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource } from 'mediabunny';

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  status: 'initializing' | 'rendering' | 'encoding' | 'completed' | 'cancelled' | 'error';
  error?: string;
}

export interface ExportSettings {
  width: number;
  height: number;
  fps: number;
  videoBitrate?: number;
}

export type ProgressCallback = (progress: ExportProgress) => void;

export class ExportManager {
  private compositor: Compositor;
  private isCancelled: boolean = false;

  constructor() {
    this.compositor = new Compositor();
  }

  public cancel() {
    this.isCancelled = true;
  }

  public async exportProject(
    project: {
        id: string;
        settings: ProjectSettings;
        assets: Record<string, Asset>;
        tracks: Record<string, Track>;
        clips: Record<string, Clip>;
        trackOrder: string[];
    },
    exportSettings: ExportSettings,
    onProgress: ProgressCallback
  ): Promise<Blob | null> {
    this.isCancelled = false;

    // Verify WebCodecs support
    if (typeof VideoEncoder === 'undefined') {
        const error = 'WebCodecs API is not supported in this browser. Please use Chrome, Edge, or a modern browser.';
        onProgress({ currentFrame: 0, totalFrames: 0, percentage: 0, status: 'error', error });
        throw new Error(error);
    }

    const { width, height, fps } = exportSettings;
    const duration = project.settings.duration;
    const totalFrames = Math.ceil(duration * fps);

    // 1. Initialize Compositor
    onProgress({ currentFrame: 0, totalFrames, percentage: 0, status: 'initializing' });

    // Flatten assets record to array
    const assetList = Object.values(project.assets);
    await this.compositor.initialize(assetList);

    // 2. Initialize Output
    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });

    // Create OffscreenCanvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to create canvas context');
    }

    // @ts-ignore - CanvasSource types might conflict with OffscreenCanvas in some envs
    const videoSource = new CanvasSource(canvas as any, {
        codec: 'avc',
        frameRate: fps,
        bitrate: exportSettings.videoBitrate || 4_000_000, // Default 4Mbps
    } as any);

    output.addVideoTrack(videoSource);

    await output.start();

    // 3. Render Loop
    try {
      const orderedTracks = project.trackOrder.map(id => project.tracks[id]).filter(Boolean);

      const renderProjectState = {
          tracks: orderedTracks,
          clips: project.clips,
          assets: project.assets,
          settings: project.settings // Pass original settings for reference if needed
      };

      for (let frame = 0; frame < totalFrames; frame++) {
        if (this.isCancelled) {
            onProgress({ currentFrame: frame, totalFrames, percentage: (frame / totalFrames) * 100, status: 'cancelled' });
            this.compositor.cleanup();
            return null;
        }

        const time = frame / fps;

        await this.compositor.renderFrame(ctx as any, time, renderProjectState);

        // Encode
        // @ts-ignore
        if (videoSource.addFrame) {
             // @ts-ignore
             await videoSource.addFrame(canvas);
        } else {
            // Fallback for older mediabunny versions or mocked env
             // @ts-ignore
             await videoSource.add(frame / fps);
        }

        if (frame % 10 === 0) {
             onProgress({
                 currentFrame: frame,
                 totalFrames,
                 percentage: (frame / totalFrames) * 100,
                 status: 'rendering'
             });
        }
      }

      onProgress({ currentFrame: totalFrames, totalFrames, percentage: 100, status: 'encoding' });

      // Finalize
      await output.finalize();

      onProgress({ currentFrame: totalFrames, totalFrames, percentage: 100, status: 'completed' });

      // Get buffer
      // @ts-ignore
      const buffer = output.target.buffer;
      if (!buffer) throw new Error('Export generated empty buffer');

      return new Blob([buffer], { type: 'video/mp4' });

    } catch (e: any) {
        console.error('Export failed', e);
        onProgress({ currentFrame: 0, totalFrames, percentage: 0, status: 'error', error: e.message });
        throw e;
    } finally {
        this.compositor.cleanup();
    }
  }
}
