import { MediaStage, StageGuides, Toggle, ToggleGroup, Toolbar, ToolbarSeparator } from 'strata-react';
import React, { useState, useEffect, useMemo } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { VideoPlayer } from './preview/VideoPlayer';
import { AudioPlayer } from './preview/AudioPlayer';
import { OverlayRenderer } from './preview/OverlayRenderer';
import { TransportControls } from './TransportControls';
import { usePlaybackLoop } from '../hooks/usePlaybackLoop';
import type { Clip, ProjectSettings } from '../types';
import { AudioEngine } from '../services/AudioEngine';
import { footageOf, routeSeconds, timeAtRouteSeconds } from '../utils/routeClock';

export const PreviewPanel: React.FC = () => {
  const currentTime = useProjectStore((state) => state.currentTime);
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const playbackRate = useProjectStore((state) => state.playbackRate);
  const masterVolume = useProjectStore((state) => state.masterVolume);
  const settings = useProjectStore((state) => state.settings);
  const setSettings = useProjectStore((state) => state.setSettings);

  const clips = useProjectStore((state) => state.clips);
  const tracks = useProjectStore((state) => state.tracks);
  const trackOrder = useProjectStore((state) => state.trackOrder);
  const assets = useProjectStore((state) => state.assets);
  // The footage under the route clips sets the route's clock (routeClock.ts)
  const footage = useMemo(() => footageOf(trackOrder, tracks, clips), [trackOrder, tracks, clips]);

  const [showSafeAreas, setShowSafeAreas] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // Use the playback loop hook to drive the engine
  usePlaybackLoop();

  // Sync master volume
  useEffect(() => {
    AudioEngine.getInstance().updateMasterVolume(masterVolume ?? 1.0);
  }, [masterVolume]);

  const activeClips: Clip[] = [];

  trackOrder.forEach(trackId => {
      const track = tracks[trackId];
      if (!track) return;

      // Find clips in this track that are active at currentTime
      // Note: We render clips even if track is muted to ensure video is visible.
      // AudioEngine handles muting audio for these tracks.
      track.clips.forEach(clipId => {
          const clip = clips[clipId];
          if (!clip) return;

          if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
              activeClips.push(clip);
          }
      });
  });

  // Calculate rendering scale based on quality setting (Low = render at 50% resolution)
  const renderScale = settings.previewQuality === 'low' ? 0.5 : settings.previewQuality === 'medium' ? 0.75 : 1;
  // We scale the content container UP to fill the viewport
  const displayScale = 1 / renderScale;

  return (
    <div className="flex flex-col w-full h-full bg-background">
      <div className="relative flex-1 bg-footage flex items-center justify-center overflow-hidden">

        {/* Preview Toolbar */}
        <Toolbar label="Preview options" className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-card/80 p-2 rounded-control backdrop-blur-sm">
          <Toggle size="sm" label="Safe areas" pressed={showSafeAreas} onChange={setShowSafeAreas} />
          <Toggle size="sm" label="Grid" pressed={showGrid} onChange={setShowGrid} />
          <ToolbarSeparator />
          <ToggleGroup
            size="sm"
            label="Preview quality"
            value={settings.previewQuality}
            onChange={(value) => setSettings({ previewQuality: value as ProjectSettings['previewQuality'] })}
            options={[
              { value: 'low', label: '50%' },
              { value: 'medium', label: '75%' },
              { value: 'high', label: '100%' },
            ]}
          />
        </Toolbar>

        {/* strata-react's stage (issue #78): fits the frame's aspect into the pane and letterboxes it */}
        <MediaStage aspect={`${settings.width}/${settings.height}`} label="Preview" className="absolute inset-0">
          <div className="absolute inset-0 bg-footage" data-testid="preview-container">
             {/* Scaled Content Layer */}
             <div
                style={{
                   width: `${100 * renderScale}%`,
                   height: `${100 * renderScale}%`,
                   transform: `scale(${displayScale})`,
                   transformOrigin: 'top left',
                   position: 'absolute',
                   top: 0,
                   left: 0,
                   overflow: 'hidden'
                }}
                data-testid="preview-scaler"
             >
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
                    } else if (clip.type === 'audio' && asset) {
                        return (
                            <AudioPlayer
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
                                routeTime={routeSeconds(clip, currentTime, footage)}
                                allAssets={assets}
                                onToggleElevationProfile={() => {
                                    const updateClip = useProjectStore.getState().updateClip;
                                    updateClip(clip.id, { properties: { ...clip.properties, showElevationProfile: !clip.properties.showElevationProfile } });
                                }}
                                onSeek={(time) => {
                                    useProjectStore.getState().setPlaybackState({ currentTime: timeAtRouteSeconds(clip, time, footage) });
                                }}
                            />
                        );
                    }
                })}
             </div>

             {(showSafeAreas || showGrid) && <StageGuides safe={showSafeAreas} thirds={showGrid} />}

             {/* Nothing under the playhead: say what fills the stage, instead of the bare time this
                 printed in monospace until 2026-11-12 (issue #145); the transport shows the time. */}
             {activeClips.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-6">
                    <p className="text-muted-foreground type-body-sm text-center">
                       {Object.keys(clips).length === 0 ? 'Add a clip to the timeline to see it here.' : 'No clip at the playhead.'}
                    </p>
                </div>
            )}
          </div>
        </MediaStage>
      </div>
      <TransportControls />
    </div>
  );
};
