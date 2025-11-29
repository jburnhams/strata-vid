import React, { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { VideoPlayer } from './preview/VideoPlayer';
import { AudioPlayer } from './preview/AudioPlayer';
import { OverlayRenderer } from './preview/OverlayRenderer';
import { TransportControls } from './TransportControls';
import { usePlaybackLoop } from '../hooks/usePlaybackLoop';
import { Clip, ProjectSettings } from '../types';
import { SafeAreaGuides } from './preview/SafeAreaGuides';

export const PreviewPanel: React.FC = () => {
  const currentTime = useProjectStore((state) => state.currentTime);
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const playbackRate = useProjectStore((state) => state.playbackRate);
  const settings = useProjectStore((state) => state.settings);
  const setSettings = useProjectStore((state) => state.setSettings);

  const clips = useProjectStore((state) => state.clips);
  const tracks = useProjectStore((state) => state.tracks);
  const trackOrder = useProjectStore((state) => state.trackOrder);
  const assets = useProjectStore((state) => state.assets);

  const [showSafeAreas, setShowSafeAreas] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // Use the playback loop hook to drive the engine
  usePlaybackLoop();

  const activeClips: Clip[] = [];

  trackOrder.forEach(trackId => {
      const track = tracks[trackId];
      if (!track || track.isMuted) return; // Muted tracks (hidden)

      // Find clips in this track that are active at currentTime
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
    <div className="flex flex-col w-full h-full bg-neutral-900">
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">

        {/* Preview Toolbar */}
        <div className="absolute top-4 right-4 z-50 flex gap-2 bg-neutral-800/80 p-2 rounded backdrop-blur-sm">
           <button
             onClick={() => setShowSafeAreas(!showSafeAreas)}
             className={`px-2 py-1 text-xs rounded transition-colors ${showSafeAreas ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-gray-300 hover:bg-neutral-600'}`}
             title="Toggle Safe Areas"
           >
             Safe Areas
           </button>
           <button
             onClick={() => setShowGrid(!showGrid)}
             className={`px-2 py-1 text-xs rounded transition-colors ${showGrid ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-gray-300 hover:bg-neutral-600'}`}
             title="Toggle Grid"
           >
             Grid
           </button>
           <div className="w-px bg-neutral-600 mx-1"></div>
           <select
             value={settings.previewQuality}
             onChange={(e) => setSettings({ previewQuality: e.target.value as ProjectSettings['previewQuality'] })}
             className="bg-neutral-700 text-gray-300 text-xs rounded px-2 py-1 border-none outline-none cursor-pointer hover:bg-neutral-600"
             title="Preview Quality"
           >
             <option value="low">Low (50%)</option>
             <option value="medium">Medium (75%)</option>
             <option value="high">High (100%)</option>
           </select>
        </div>

        {/* Aspect Ratio Container */}
        <div
           style={{
             aspectRatio: `${settings.width} / ${settings.height}`,
             width: '100%',
             height: 'auto',
             maxHeight: '100%',
             maxWidth: '100%', // Let flex container constrain it
             position: 'relative',
             backgroundColor: '#000',
             overflow: 'hidden'
           }}
           className="shadow-lg ring-1 ring-neutral-800"
           data-testid="preview-container"
        >
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
                                allAssets={assets}
                                onToggleElevationProfile={() => {
                                    const updateClip = useProjectStore.getState().updateClip;
                                    updateClip(clip.id, { properties: { ...clip.properties, showElevationProfile: !clip.properties.showElevationProfile } });
                                }}
                                onSeek={(time) => {
                                    useProjectStore.getState().setPlaybackState({ currentTime: clip.start + time });
                                }}
                            />
                        );
                    }
                })}
             </div>

             <SafeAreaGuides showSafeAreas={showSafeAreas} showGrid={showGrid} />

             {activeClips.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="text-gray-600 text-sm font-mono">
                       {currentTime.toFixed(2)}s
                    </div>
                </div>
            )}
        </div>
      </div>
      <TransportControls />
    </div>
  );
};
