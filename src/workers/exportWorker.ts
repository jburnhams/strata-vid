// The export worker: draws every frame of the timeline on an OffscreenCanvas and encodes it with
// mediabunny, together with the timeline's sound.
//
// The sound is mixed on the main thread (ExportManager, with AudioCompositor) and arrives here as
// `audioData`, because workers have no OfflineAudioContext: mixing here failed in every browser and
// every export came out silent (issue #141). It is encoded through an AudioSampleSource in one-second
// samples, interleaved with the video frames, in the codec the person chose, or in another codec the
// container takes when this browser cannot encode that one (Playwright's Chromium and Firefox have no
// AAC encoder); the finished message says so, and says when there was no sound to export.
import { WorkerCompositor } from '../services/WorkerCompositor';
import {
    Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, AudioSampleSource, AudioSample,
    canEncodeAudio, canEncodeVideo,
} from 'mediabunny';
import type { AudioCodec, VideoCodec } from 'mediabunny';

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
        self.postMessage({ type: 'error', error: err?.message || 'The export stopped in the encoder.' });
    }
  }
};

/** The sound to export, mixed on the main thread, or why there is none. */
export interface ExportAudio {
    channels: Float32Array[];
    sampleRate: number;
}

const CODEC_NAMES: Record<string, string> = { aac: 'AAC', opus: 'Opus', mp3: 'MP3', vorbis: 'Vorbis', flac: 'FLAC', avc: 'H.264', hevc: 'H.265', vp9: 'VP9', vp8: 'VP8', av1: 'AV1' };
const codecName = (codec: string) => CODEC_NAMES[codec] ?? codec;

/** Seconds of sound in each sample handed to the encoder. */
const AUDIO_CHUNK = 1;

export async function runExport(payload: any) {
    const { project, exportSettings } = payload;
    const audioData: ExportAudio | null = payload.audioData ?? null;
    const notes: string[] = payload.audioNote ? [payload.audioNote] : [];
    const { width, height, fps, videoBitrate, format, videoCodec, audioCodec, audioBitrate } = exportSettings;
    const duration = project.settings.duration;
    const totalFrames = Math.ceil(duration * fps);

    // 1. Initialize Compositor
    self.postMessage({ type: 'progress', progress: { currentFrame: 0, totalFrames, percentage: 0, status: 'initializing' } });

    const assetList = Object.values(project.assets);
    await compositor.initialize(assetList as any[]);

    if (isCancelled) {
        self.postMessage({ type: 'progress', progress: { status: 'cancelled' } });
        return;
    }

    const orderedTracks = project.trackOrder.map((id: string) => project.tracks[id]).filter(Boolean);
    const renderProjectState = {
        tracks: orderedTracks,
        clips: project.clips,
        assets: project.assets,
        settings: project.settings
    };
    compositor.planFrames(renderProjectState, fps, totalFrames);

    // 2. Output
    const outputFormat = format === 'webm' ? new WebMOutputFormat() : new Mp4OutputFormat();
    const output = new Output({ format: outputFormat, target: new BufferTarget() });

    // Video: the chosen codec, or a reason the person can act on.
    const vCodec: VideoCodec = videoCodec || (format === 'webm' ? 'vp9' : 'avc');
    if (!outputFormat.getSupportedVideoCodecs().includes(vCodec)) {
        throw new Error(`${format === 'webm' ? 'WebM' : 'MP4'} cannot hold ${codecName(vCodec)} video. Choose another video codec.`);
    }
    if (!(await canEncodeVideo(vCodec, { width, height, bitrate: videoBitrate || 6_000_000 }))) {
        throw new Error(`This browser cannot encode ${codecName(vCodec)} video at ${width}×${height}. Choose another video codec or a smaller size.`);
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as OffscreenCanvasRenderingContext2D;
    if (!ctx) throw new Error('This browser could not give the export a canvas to draw on.');

    const videoSource = new CanvasSource(canvas, { codec: vCodec, bitrate: videoBitrate || 6_000_000 });
    output.addVideoTrack(videoSource, { frameRate: fps });

    // Audio: the chosen codec if this browser encodes it, else another the container takes.
    let audioSource: AudioSampleSource | null = null;
    const channelCount = audioData?.channels.length ?? 0;
    if (audioData && channelCount > 0) {
        const wanted: AudioCodec = audioCodec || (format === 'webm' ? 'opus' : 'aac');
        const candidates = [wanted, ...outputFormat.getSupportedAudioCodecs().filter((c) => c !== wanted && (c === 'aac' || c === 'opus'))]
            .filter((c) => outputFormat.getSupportedAudioCodecs().includes(c));
        let chosen: AudioCodec | null = null;
        for (const codec of candidates) {
            if (await canEncodeAudio(codec, { numberOfChannels: channelCount, sampleRate: audioData.sampleRate, bitrate: audioBitrate || 128_000 })) {
                chosen = codec;
                break;
            }
        }
        if (chosen) {
            audioSource = new AudioSampleSource({ codec: chosen, bitrate: audioBitrate || 128_000 });
            output.addAudioTrack(audioSource);
            if (chosen !== wanted) notes.push(`The sound is ${codecName(chosen)}: this browser cannot encode ${codecName(wanted)}.`);
        } else {
            notes.push(`Saved without sound: this browser cannot encode ${codecName(wanted)} audio.`);
        }
    }

    await output.start();

    // 3. Render loop, with the sound added a second ahead of the frames.
    let audioAddedUntil = 0; // in samples
    const addAudioUntil = async (seconds: number) => {
        if (!audioSource || !audioData) return;
        const total = audioData.channels[0].length;
        const end = Math.min(total, Math.round(seconds * audioData.sampleRate));
        const chunk = Math.round(AUDIO_CHUNK * audioData.sampleRate);
        while (audioAddedUntil < end) {
            const chunkEnd = Math.min(total, audioAddedUntil + chunk);
            const frames = chunkEnd - audioAddedUntil;
            const planar = new Float32Array(frames * channelCount);
            audioData.channels.forEach((channel, i) => planar.set(channel.subarray(audioAddedUntil, chunkEnd), i * frames));
            const sample = new AudioSample({
                data: planar,
                format: 'f32-planar',
                numberOfChannels: channelCount,
                sampleRate: audioData.sampleRate,
                timestamp: audioAddedUntil / audioData.sampleRate,
            });
            await audioSource.add(sample);
            sample.close();
            audioAddedUntil = chunkEnd;
        }
    };

    for (let frame = 0; frame < totalFrames; frame++) {
        if (isCancelled) {
            self.postMessage({ type: 'progress', progress: { status: 'cancelled' } });
            compositor.cleanup();
            return;
        }

        const time = frame / fps;
        await addAudioUntil(time + AUDIO_CHUNK);
        await compositor.renderFrame(ctx, time, renderProjectState);
        await videoSource.add(time, 1 / fps);

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
    await addAudioUntil(Infinity);

    self.postMessage({ type: 'progress', progress: { currentFrame: totalFrames, totalFrames, percentage: 100, status: 'encoding' } });

    await output.finalize();
    compositor.cleanup();

    if (isCancelled) {
         self.postMessage({ type: 'progress', progress: { status: 'cancelled' } });
         return;
    }

    const buffer = output.target.buffer;
    const mimeType = format === 'webm' ? 'video/webm' : 'video/mp4';
    const blob = new Blob([buffer ?? new ArrayBuffer(0)], { type: mimeType });

    self.postMessage({ type: 'complete', blob, totalFrames, notes });
}

// Export for testing
export const setIsCancelled = (val: boolean) => { isCancelled = val; };
