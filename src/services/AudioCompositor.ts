import { Asset, Clip, Track } from '../types';

export class AudioCompositor {
  private audioContext: OfflineAudioContext | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();

  constructor() {}

  public async renderAudio(
    project: {
        tracks: Track[];
        clips: Record<string, Clip>;
        assets: Record<string, Asset>;
        settings: { duration: number };
    },
    sampleRate: number = 44100
  ): Promise<AudioBuffer | null> {
      try {
          const length = Math.ceil(project.settings.duration * sampleRate);
          // @ts-ignore - Handle webkit prefix if necessary, though OfflineAudioContext is standard
          const OfflineContext = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
          if (!OfflineContext) {
              console.error('OfflineAudioContext not supported');
              return null;
          }

          this.audioContext = new OfflineContext(2, length, sampleRate);

          // Pre-load audio buffers
          await this.loadBuffers(project.assets);

          // Schedule Clips
          for (const track of project.tracks) {
              if (track.isMuted) continue;

              const trackClips = track.clips.map(id => project.clips[id]).filter(Boolean);

              for (const clip of trackClips) {
                  await this.scheduleClip(clip, track, project.assets);
              }
          }

          if (!this.audioContext) return null;
          return await this.audioContext.startRendering();
      } catch (e) {
          console.error('Audio rendering failed', e);
          return null;
      }
  }

  private async loadBuffers(assets: Record<string, Asset>) {
      for (const asset of Object.values(assets)) {
          if ((asset.type === 'audio' || asset.type === 'video') && !this.bufferCache.has(asset.id)) {
              try {
                  const response = await fetch(asset.src);
                  const arrayBuffer = await response.arrayBuffer();

                  if (this.audioContext) {
                      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                      this.bufferCache.set(asset.id, audioBuffer);
                  }
              } catch (e) {
                  console.warn(`Failed to load audio for asset ${asset.id}`, e);
              }
          }
      }
  }

  private async scheduleClip(clip: Clip, track: Track, assets: Record<string, Asset>) {
      if (!this.audioContext) return;

      const asset = assets[clip.assetId];
      if (!asset) return;

      const buffer = this.bufferCache.get(asset.id);
      if (!buffer) return;

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;

      const gainNode = this.audioContext.createGain();

      const baseVolume = (track.volume ?? 1) * (clip.volume ?? 1);
      gainNode.gain.value = baseVolume;

      // Transitions (Fade In)
      if (clip.transitionIn) {
          const { duration, type } = clip.transitionIn;
          const startTime = clip.start;

          if (type === 'crossfade' || type === 'fade') {
              gainNode.gain.setValueAtTime(0, startTime);
              gainNode.gain.linearRampToValueAtTime(baseVolume, startTime + duration);
          }
      }

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start(clip.start, clip.offset, clip.duration);
  }
}
