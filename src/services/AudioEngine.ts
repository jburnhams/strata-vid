import { Track } from '../types';

/**
 * AudioEngine Service
 *
 * Manages the Web Audio API Context and the audio routing graph.
 * Implements a Singleton pattern to ensure only one AudioContext exists.
 *
 * Graph Topology:
 * Source (Video/Audio Element) -> Clip Gain -> Track Gain -> Master Gain -> Destination
 */
export class AudioEngine {
  private static instance: AudioEngine;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Map of clipId -> { sourceNode, gainNode, trackId }
  private clipNodes = new Map<string, {
    source: MediaElementAudioSourceNode;
    gain: GainNode;
    trackId: string;
  }>();

  // Map of trackId -> GainNode
  private trackGains = new Map<string, GainNode>();

  // Cache for MediaElementAudioSourceNodes to avoid "can only be connected once" error
  private sourceNodeCache = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

  private constructor() {
     this.initializeContext();
  }

  /**
   * Initializes the AudioContext if supported by the browser.
   */
  private initializeContext() {
    if (typeof window !== 'undefined') {
       // Support for standard and webkit prefixed AudioContext
       const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
       if (AudioContextClass) {
         this.audioContext = new AudioContextClass();
         this.masterGain = this.audioContext.createGain();
         this.masterGain.connect(this.audioContext.destination);
         console.log('AudioEngine initialized');
       } else {
         console.warn('Web Audio API not supported in this browser.');
       }
    }
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public getContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Resumes the AudioContext if it was suspended (e.g. by browser policy).
   * This is typically required by browsers before audio can play and should
   * be triggered by a user interaction event (e.g. Play button click).
   */
  public async resumeContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('AudioContext resumed');
      } catch (e) {
        console.warn('Failed to resume AudioContext:', e);
      }
    }
  }

  /**
   * Registers a track and creates its GainNode in the audio graph.
   * If the track already exists, it updates its volume/mute state instead of creating a new node.
   *
   * @param trackId Unique identifier for the track
   * @param volume Volume level (0.0 to 1.0+)
   * @param isMuted Whether the track is muted
   */
  public registerTrack(trackId: string, volume: number, isMuted: boolean) {
    if (!this.audioContext || !this.masterGain) return;

    if (!this.trackGains.has(trackId)) {
      const trackGain = this.audioContext.createGain();
      trackGain.connect(this.masterGain);
      this.trackGains.set(trackId, trackGain);
    }
    this.updateTrackVolume(trackId, volume, isMuted);
  }

  /**
   * Unregisters a track and cleans up its GainNode.
   */
  public unregisterTrack(trackId: string) {
      const trackGain = this.trackGains.get(trackId);
      if (trackGain) {
          trackGain.disconnect();
          this.trackGains.delete(trackId);
      }
  }

  /**
   * Registers a clip (source) and connects it to the audio graph.
   * Source -> ClipGain -> TrackGain
   *
   * @param clipId Unique identifier for the clip
   * @param trackId The track this clip belongs to
   * @param sourceElement The HTMLMediaElement (<video> or <audio>)
   * @param volume Initial volume (0-1+)
   */
  public registerClip(
      clipId: string,
      trackId: string,
      sourceElement: HTMLMediaElement,
      volume: number
  ) {
      if (!this.audioContext || !this.masterGain) return;

      // Auto-register track if missing (safety fallback)
      if (!this.trackGains.has(trackId)) {
          this.registerTrack(trackId, 1.0, false);
      }
      const trackGain = this.trackGains.get(trackId);
      if (!trackGain) return;

      // Clean up existing registration if any
      if (this.clipNodes.has(clipId)) {
          this.unregisterClip(clipId);
      }

      let sourceNode: MediaElementAudioSourceNode;

      if (this.sourceNodeCache.has(sourceElement)) {
          sourceNode = this.sourceNodeCache.get(sourceElement)!;
          // Disconnect from previous graph points if reusing
          try {
             sourceNode.disconnect();
          } catch (e) { /* ignore */ }
      } else {
          try {
            // createMediaElementSource "hijacks" the element's audio output.
            // The element should NOT be muted in DOM, but it won't play to speakers directly anymore.
            sourceNode = this.audioContext.createMediaElementSource(sourceElement);
            this.sourceNodeCache.set(sourceElement, sourceNode);
          } catch (e) {
            console.warn(`Failed to create MediaElementSource for clip ${clipId}. It might be already connected.`, e);
            return;
          }
      }

      const clipGain = this.audioContext.createGain();
      clipGain.gain.value = volume;

      // Connect graph
      sourceNode.connect(clipGain);
      clipGain.connect(trackGain);

      this.clipNodes.set(clipId, {
          source: sourceNode,
          gain: clipGain,
          trackId
      });
  }

  /**
   * Unregisters a clip and disconnects its nodes.
   */
  public unregisterClip(clipId: string) {
      const nodes = this.clipNodes.get(clipId);
      if (nodes) {
          try {
            nodes.source.disconnect();
            nodes.gain.disconnect();
          } catch (e) {
            console.warn(`Error disconnecting nodes for clip ${clipId}:`, e);
          }
          this.clipNodes.delete(clipId);
      }
  }

  public updateClipVolume(clipId: string, volume: number) {
      const nodes = this.clipNodes.get(clipId);
      if (nodes && nodes.gain) {
          // Use setTargetAtTime for smoother transition if needed, but direct assignment is fine for now
          nodes.gain.gain.value = volume;
      }
  }

  public updateTrackVolume(trackId: string, volume: number, isMuted: boolean) {
      const trackGain = this.trackGains.get(trackId);
      if (trackGain) {
          trackGain.gain.value = isMuted ? 0 : volume;
      }
  }

  public updateMasterVolume(volume: number) {
      if (this.masterGain) {
          this.masterGain.gain.value = volume;
      }
  }

  public getDebugInfo() {
      return {
          tracks: this.trackGains.size,
          clips: this.clipNodes.size,
          state: this.audioContext?.state
      };
  }
}
