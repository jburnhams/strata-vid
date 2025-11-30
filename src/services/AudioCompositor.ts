import { Clip, ProjectState, Track } from '../types';
import { readFileToArrayBuffer } from '../utils/audioUtils';

export class AudioCompositor {
  private offlineContext: OfflineAudioContext | null = null;

  /**
   * Renders the audio for the entire project into a single AudioBuffer.
   * This buffer can then be passed to the export worker for encoding.
   */
  async render(project: ProjectState): Promise<AudioBuffer> {
    const { duration } = project.settings;
    const sampleRate = 44100; // Standard CD quality
    // Use OfflineAudioContext to render faster than real-time
    // Length is in samples
    const length = Math.ceil(duration * sampleRate);

    // Safari/Webkit check (standard vs prefixed)
    // @ts-ignore
    const OfflineContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineContextClass) {
        throw new Error('OfflineAudioContext not supported');
    }

    this.offlineContext = new OfflineContextClass(2, length, sampleRate);
    const ctx = this.offlineContext!;

    // Create Master Gain
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    // Iterate through tracks
    // Sort track order? Audio is additive, so order doesn't strictly matter for mixing,
    // but we should respect the track structure for volume control.
    const tracks = Object.values(project.tracks);

    // Load and schedule clips
    // We can do this in parallel
    const clipPromises = tracks.map(async (track) => {
        const trackGain = ctx.createGain();
        trackGain.gain.value = track.isMuted ? 0 : track.volume;
        trackGain.connect(masterGain);

        const clips = track.clips.map(clipId => project.clips[clipId]).filter(Boolean);

        for (const clip of clips) {
             await this.scheduleClip(ctx, trackGain, clip, project.assets[clip.assetId]);
        }
    });

    await Promise.all(clipPromises);

    return await ctx.startRendering();
  }

  private async scheduleClip(
      ctx: BaseAudioContext,
      outputNode: AudioNode,
      clip: Clip,
      asset: any
  ) {
      if (!asset || !asset.file) {
          console.warn(`Missing asset file for clip ${clip.id}`);
          return;
      }

      // Skip non-audio assets unless we extract audio from video
      if (asset.type !== 'audio' && asset.type !== 'video') {
          return;
      }

      try {
          // Decode audio data using the existing context
          // Use readFileToArrayBuffer instead of decodeAudioFromFile to avoid creating new contexts
          const arrayBuffer = await readFileToArrayBuffer(asset.file);
          const buffer = await ctx.decodeAudioData(arrayBuffer);

          const source = ctx.createBufferSource();
          source.buffer = buffer;

          // Clip Gain
          const clipGain = ctx.createGain();
          clipGain.gain.value = clip.volume;

          source.connect(clipGain);
          clipGain.connect(outputNode);

          // Calculate timing
          // Start time in destination (timeline)
          const startTime = clip.start;

          // Offset in source
          const offset = clip.offset;

          // Duration to play
          // The duration parameter in start() is in context time (seconds),
          // determining how long the source will play on the destination timeline.
          // It automatically handles the playback rate scaling for source content consumption.
          const duration = clip.duration;
          const rate = clip.playbackRate || 1;

          // Playback Rate
          if (rate !== 1) {
              source.playbackRate.value = rate;
          }

          source.start(startTime, offset, duration);

      } catch (e) {
          console.error(`Failed to schedule clip ${clip.id}`, e);
      }
  }
}
