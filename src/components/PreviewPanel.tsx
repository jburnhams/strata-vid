import React, { useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { VideoPlayer } from './preview/VideoPlayer';
import { OverlayRenderer } from './preview/OverlayRenderer';
import { usePlaybackLoop } from '../hooks/usePlaybackLoop';
import { Clip } from '../types';

export const PreviewPanel: React.FC = () => {
  const currentTime = useProjectStore((state) => state.currentTime);
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const playbackRate = useProjectStore((state) => state.playbackRate);

  // We need to get all clips and tracks to determine what to render
  const clips = useProjectStore((state) => state.clips);
  const tracks = useProjectStore((state) => state.tracks);
  const trackOrder = useProjectStore((state) => state.trackOrder);
  const assets = useProjectStore((state) => state.assets);

  // Use the playback loop hook to drive the engine
  usePlaybackLoop();

  // Filter active clips
  // We iterate through track order (bottom to top for rendering order usually, but tracks are often layers.
  // Standard NLE: Top track is on top.
  // trackOrder[0] is usually bottom? Let's assume index 0 is bottom, last is top.
  // But wait, Track 1 is usually Video 1, Track 2 is Video 2 (top).
  // I need to verify track rendering order. Usually higher index = higher z-index.
  // In `src/store/slices/timelineSlice.ts`, `trackOrder` is just an array of IDs.
  // We should render in `trackOrder`.

  const activeClips: Clip[] = [];

  trackOrder.forEach(trackId => {
      const track = tracks[trackId];
      if (!track || track.isMuted) return; // Muted tracks (hidden)

      // Find clips in this track that are active at currentTime
      // Since clips is a dictionary, we iterate track.clips (array of ids)
      track.clips.forEach(clipId => {
          const clip = clips[clipId];
          if (!clip) return;

          if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
              activeClips.push(clip);
          }
      });
  });

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
        {/* Layer 1: Background (Black container already) */}

        {/* Layer 2: Render active clips.
            Since we pushed them in track order, rendering them in array order puts later tracks on top.
        */}
        {activeClips.map(clip => {
            const asset = assets[clip.assetId];
            if (!asset && clip.type !== 'text') return null; // Text might not have asset

            if (clip.type === 'video' && asset) {
                return (
                    <VideoPlayer
                        key={clip.id}
                        clip={clip}
                        asset={asset}
                        currentTime={currentTime}
                        isPlaying={isPlaying}
                        playbackRate={playbackRate}
                    />
                );
            } else {
                return (
                    <OverlayRenderer
                        key={clip.id}
                        clip={clip}
                        asset={asset}
                        currentTime={currentTime}
                    />
                );
            }
        })}

        {/* Helper overlay for empty state? */}
        {activeClips.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-gray-600 text-sm">
                   {currentTime.toFixed(2)}s
                </div>
            </div>
        )}
    </div>
  );
};
