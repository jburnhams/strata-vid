import { Asset, Clip, ProjectSettings, Track } from '../types';
import { createExportWorker } from '../utils/workerUtils';

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
  format?: 'mp4' | 'webm';
  videoCodec?: 'avc' | 'hevc' | 'vp9' | 'av1';
  audioCodec?: 'aac' | 'opus';
  audioBitrate?: number;
}

export type ProgressCallback = (progress: ExportProgress) => void;

export class ExportManager {
  private worker: Worker | null = null;

  constructor() {}

  public cancel() {
    if (this.worker) {
        this.worker.postMessage({ type: 'cancel' });
    }
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

    // Verify WebCodecs support
    if (typeof VideoEncoder === 'undefined') {
        const error = 'WebCodecs API is not supported in this browser. Please use Chrome, Edge, or a modern browser.';
        onProgress({ currentFrame: 0, totalFrames: 0, percentage: 0, status: 'error', error });
        throw new Error(error);
    }

    // Note: Audio preparation is now handled inside the worker to avoid blocking main thread.

    return new Promise((resolve, reject) => {
        try {
            this.worker = createExportWorker();

            this.worker.onmessage = (e) => {
                const { type, progress, blob, error } = e.data;

                if (type === 'progress') {
                    onProgress(progress);
                    if (progress.status === 'cancelled') {
                        this.terminateWorker();
                        resolve(null);
                    }
                } else if (type === 'complete') {
                    // Send final complete status just in case
                    onProgress({
                        currentFrame: progress?.totalFrames || 0,
                        totalFrames: progress?.totalFrames || 0,
                        percentage: 100,
                        status: 'completed'
                    });
                    this.terminateWorker();
                    resolve(blob);
                } else if (type === 'error') {
                    const msg = error || 'Unknown worker error';
                    onProgress({
                        currentFrame: 0,
                        totalFrames: 0,
                        percentage: 0,
                        status: 'error',
                        error: msg
                    });
                    this.terminateWorker();
                    reject(new Error(msg));
                }
            };

            this.worker.onerror = (e) => {
                console.error('Worker error event:', e);
                const msg = e.message || 'Worker error';
                onProgress({
                    currentFrame: 0,
                    totalFrames: 0,
                    percentage: 0,
                    status: 'error',
                    error: msg
                });
                this.terminateWorker();
                reject(new Error(msg));
            };

            // Start Export
            // We do not pass audioData here; the worker will generate it.
            this.worker.postMessage({
                type: 'start',
                payload: {
                    project,
                    exportSettings,
                    // audioData: undefined
                }
            });

        } catch (e: any) {
            console.error('Export initiation failed', e);
            onProgress({ currentFrame: 0, totalFrames: 0, percentage: 0, status: 'error', error: e.message });
            this.terminateWorker();
            reject(e);
        }
    });
  }

  private terminateWorker() {
      if (this.worker) {
          this.worker.terminate();
          this.worker = null;
      }
  }
}
