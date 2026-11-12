import type { Asset, Clip, ProjectSettings, Track } from '../types';
import { createExportWorker } from '../utils/workerUtils';
import { AudioCompositor } from './AudioCompositor';

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  status: 'initializing' | 'rendering' | 'encoding' | 'completed' | 'cancelled' | 'error';
  error?: string;
  /** Sentences for the finished export, such as a codec swapped or the sound left out. */
  notes?: string[];
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
  /** Set by `cancel` before the worker exists (while the sound is mixed), and checked before it starts. */
  private cancelled = false;

  constructor() {}

  public cancel() {
    this.cancelled = true;
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

    // The sound is mixed here: OfflineAudioContext exists only on the main thread, and mixing it in
    // the worker failed in every browser, so every export was silent (issue #141).
    this.cancelled = false;
    onProgress({ currentFrame: 0, totalFrames: 0, percentage: 0, status: 'initializing' });
    const { audioData, audioNote } = await this.mixAudio(project);
    if (this.cancelled) {
        onProgress({ currentFrame: 0, totalFrames: 0, percentage: 0, status: 'cancelled' });
        return null;
    }

    return new Promise((resolve, reject) => {
        try {
            this.worker = createExportWorker();

            this.worker.onmessage = (e) => {
                const { type, progress, blob, error, totalFrames, notes } = e.data;

                if (type === 'progress') {
                    onProgress(progress);
                    if (progress.status === 'cancelled') {
                        this.terminateWorker();
                        resolve(null);
                    }
                } else if (type === 'complete') {
                    // Send final complete status just in case
                    onProgress({
                        currentFrame: totalFrames || 0,
                        totalFrames: totalFrames || 0,
                        percentage: 100,
                        status: 'completed',
                        notes: notes ?? []
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

            this.worker.postMessage(
                { type: 'start', payload: { project, exportSettings, audioData, audioNote } },
                audioData ? audioData.channels.map((c) => c.buffer as ArrayBuffer) : [],
            );

        } catch (e: any) {
            console.error('Export initiation failed', e);
            onProgress({ currentFrame: 0, totalFrames: 0, percentage: 0, status: 'error', error: e.message });
            this.terminateWorker();
            reject(e);
        }
    });
  }

  /**
   * Mixes the timeline's sound. Returns no data, and no note, when nothing on the timeline can make
   * a sound; returns a note when mixing failed, so the finished export says it has no sound.
   */
  private async mixAudio(project: Parameters<ExportManager['exportProject']>[0]): Promise<{ audioData: { channels: Float32Array[]; sampleRate: number } | null; audioNote?: string }> {
    const audible = Object.values(project.clips).some((clip) => {
      const asset = project.assets[clip.assetId];
      return asset && (asset.type === 'audio' || asset.type === 'video') && (clip.volume ?? 1) > 0;
    });
    if (!audible || project.settings.duration <= 0) return { audioData: null };
    try {
      const buffer = await new AudioCompositor().render(project as any);
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i).slice());
      return { audioData: { channels, sampleRate: buffer.sampleRate } };
    } catch (e: any) {
      console.warn('Mixing the sound for export failed', e);
      return { audioData: null, audioNote: `Saved without sound: the sound could not be mixed (${e?.message ?? 'unknown reason'}).` };
    }
  }

  private terminateWorker() {
      if (this.worker) {
          this.worker.terminate();
          this.worker = null;
      }
  }
}
