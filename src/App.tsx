import React, { useState, useCallback } from 'react';
import { LibraryPanel } from './components/LibraryPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { MetadataPanel } from './components/MetadataPanel';
import { TimelinePanel } from './components/TimelinePanel';
import { ProjectMenu } from './components/ProjectMenu';
import { EditMenu } from './components/EditMenu';
import { useProjectStore } from './store/useProjectStore';
import { Asset, Track, Clip } from './types';
import { AssetLoader } from './services/AssetLoader';
import { ExportModal } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import { ConfirmModal } from './components/ConfirmModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ToastContainer } from './components/Toast';
import { LoadingOverlay } from './components/LoadingOverlay';
import { handleError, showSuccess } from './utils/errorHandler';
import { Tooltip } from './components/Tooltip';
import { useAutoSave } from './hooks/useAutoSave';
import { HelpCircle } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  pointerWithin
} from '@dnd-kit/core';
import { ClipItem } from './components/timeline/ClipItem';
import {
  checkCollision,
  getSnapPoints,
  findNearestSnapPoint,
  findNearestValidTime,
} from './utils/timelineUtils';

function App() {
  const [showExport, setShowExport] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [confirmModal, setConfirmModal] = React.useState<{ isOpen: boolean; assetId: string | null }>({
    isOpen: false,
    assetId: null,
  });

  // Drag State
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<'Clip' | 'Asset' | null>(null);
  const [snapLine, setSnapLine] = useState<number | null>(null);
  const [isValidDrop, setIsValidDrop] = useState(true);

  // Ref for accessing timeline geometry
  const timelineScrollRef = React.useRef<HTMLDivElement>(null);

  const toggleHelp = () => setShowHelp(prev => !prev);
  useKeyboardShortcuts(toggleHelp);
  useAutoSave();

  const {
    assets: assetsRecord,
    clips: clipsRecord,
    tracks: tracksRecord,
    selectedAssetId,
    settings,
    setSettings,
    addAsset,
    updateAsset,
    removeAsset,
    selectAsset,
    addClip,
    addTrack,
    removeClipsByAssetId,
    setLoading,
    moveClip,
    selectClip,
    trackOrder,
    currentTime,
    zoomLevel
  } = useProjectStore();

  // Convert Records to Arrays for UI consumption and logic
  const assets = Object.values(assetsRecord || {});
  const clips = Object.values(clipsRecord || {});
  const tracks = Object.values(tracksRecord || {});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required to start drag
      },
    })
  );

  const handleAssetAdd = async (fileList: FileList) => {
    setLoading(true, 'Loading assets...');
    try {
      const newAssetsPromises = Array.from(fileList).map(async (file) => {
        try {
          return await AssetLoader.loadAsset(file, {
            simplificationTolerance: settings.simplificationTolerance,
          });
        } catch (e) {
          handleError(e, `Failed to load ${file.name}`);
          return null;
        }
      });

      const newAssets = (await Promise.all(newAssetsPromises)).filter((a): a is Asset => a !== null);

      newAssets.forEach(asset => {
          // Add basic asset immediately (with duration but no thumbnail)
          addAsset(asset);

          // Lazy load thumbnail
          if (asset.file) {
              AssetLoader.loadThumbnail(asset.file, asset.type).then(thumbnail => {
                  updateAsset(asset.id, { thumbnail });
              }).catch(e => {
                  console.warn(`Failed to generate thumbnail for ${asset.name}`, e);
              });
          }
      });

      if (newAssets.length > 0) {
          selectAsset(newAssets[0].id);
          showSuccess(`Loaded ${newAssets.length} asset${newAssets.length > 1 ? 's' : ''}`);
      }
    } catch (e) {
      handleError(e, 'Failed to process assets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssetUpdate = async (id: string, file: File) => {
      const asset = assetsRecord[id];
      if (!asset) return;

      try {
          // 1. Update source immediately to restore playback
          const src = URL.createObjectURL(file);
          updateAsset(id, { src, file });
          showSuccess(`Relinked ${asset.name}`);

          // 2. Regenerate thumbnail in background
          try {
              const thumbnail = await AssetLoader.loadThumbnail(file, asset.type);
              updateAsset(id, { thumbnail });
          } catch (e) {
              console.warn(`Failed to regenerate thumbnail for ${asset.name}`, e);
          }
      } catch (e) {
          handleError(e, `Failed to relink ${asset.name}`);
      }
  };

  const handleAssetRemove = (id: string) => {
    // Check if asset is used in any clip
    const isUsed = clips.some(clip => clip.assetId === id);

    if (isUsed) {
      setConfirmModal({ isOpen: true, assetId: id });
    } else {
      removeAsset(id);
    }
  };

  const confirmAssetRemove = () => {
    if (confirmModal.assetId) {
      removeClipsByAssetId(confirmModal.assetId);
      removeAsset(confirmModal.assetId);
      setConfirmModal({ isOpen: false, assetId: null });
    }
  };

  // --- Drag & Drop Handlers ---

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type;

    setActiveDragId(active.id as string);
    setActiveDragType(type);
    setIsValidDrop(true);
    setSnapLine(null);

    if (type === 'Clip') {
      selectClip(active.id as string);
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over, delta } = event;
    if (!active) return;

    // Reset feedback
    setSnapLine(null);
    setIsValidDrop(true);

    const type = active.data.current?.type;

    // Logic for Clips (Moving existing)
    if (type === 'Clip') {
        const clipId = active.id as string;
        const clip = clipsRecord[clipId];
        if (!clip) return;

        const deltaSeconds = delta.x / zoomLevel;
        let newStart = clip.start + deltaSeconds;
        newStart = Math.max(0, newStart);

        // Snap Logic
        if (settings.snapToGrid) {
            const snapPoints = getSnapPoints(clipsRecord, currentTime);
            const snapTolerance = 10 / zoomLevel;
            const snappedStart = findNearestSnapPoint(newStart, snapPoints, snapTolerance);

            if (snappedStart !== null) {
                setSnapLine(snappedStart);
                newStart = snappedStart;
            } else {
                 const newEnd = newStart + clip.duration;
                 const snappedEnd = findNearestSnapPoint(newEnd, snapPoints, snapTolerance);
                 if (snappedEnd !== null) {
                    setSnapLine(snappedEnd);
                 }
            }
        }

        // Collision Logic
        if (over) {
            const targetTrackId = over.id as string;
            const targetTrack = tracksRecord[targetTrackId];
            if (targetTrack) {
                const trackClips = targetTrack.clips
                    .map(id => clipsRecord[id])
                    .filter(c => c && c.id !== clipId);

                if (checkCollision(newStart, clip.duration, trackClips)) {
                    if (!settings.allowOverlaps) {
                        setIsValidDrop(false);
                    }
                }
            }
        }
    }
  };

  // Improved Drag Logic using the ref
  const getTimelineTime = (screenX: number): number | null => {
      if (!timelineScrollRef.current) return null;
      const rect = timelineScrollRef.current.getBoundingClientRect();
      const scrollLeft = timelineScrollRef.current.scrollLeft;
      const relativeX = screenX - rect.left + scrollLeft;
      return Math.max(0, relativeX / zoomLevel);
  };

  const handleDragMoveImproved = (event: DragMoveEvent) => {
      handleDragMove(event); // Run existing logic

      const { active, over } = event;
      if (active.data.current?.type !== 'Asset' || !over) return;

      // Asset Drag Logic
      const screenX = event.active.rect.current.translated?.left || 0;

      const time = getTimelineTime(screenX + 20); // Add small offset
      if (time === null) return;

      const trackId = over.id as string;
      const track = tracksRecord[trackId];
      if (!track) return;

      // Calculate snap to nearest start/end on THIS track
      const trackClips = track.clips.map(id => clipsRecord[id]).filter(Boolean);
      let snapCandidates = [0];
      trackClips.forEach(c => snapCandidates.push(c.start + c.duration));

      // Find closest
      let closest = snapCandidates[0];
      let minDiff = Math.abs(time - closest);

      snapCandidates.forEach(t => {
          const diff = Math.abs(time - t);
          if (diff < minDiff) {
              minDiff = diff;
              closest = t;
          }
      });

      setSnapLine(closest);
      setIsValidDrop(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveDragId(null);
    setActiveDragType(null);
    setSnapLine(null);
    setIsValidDrop(true);

    if (!over) return;

    const type = active.data.current?.type;

    if (type === 'Clip') {
        const clipId = active.id as string;
        const clip = clipsRecord[clipId];
        if (!clip) return;

        const targetTrackId = over.id as string;

        // Re-calculate new start (same logic as Move)
        const deltaSeconds = delta.x / zoomLevel;
        let newStart = clip.start + deltaSeconds;
        newStart = Math.max(0, newStart);

        if (settings.snapToGrid) {
             const snapPoints = getSnapPoints(clipsRecord, currentTime);
             const snapTolerance = 10 / zoomLevel;
             const snappedStart = findNearestSnapPoint(newStart, snapPoints, snapTolerance);
             if (snappedStart !== null) newStart = snappedStart;
             else {
                 const newEnd = newStart + clip.duration;
                 const snappedEnd = findNearestSnapPoint(newEnd, snapPoints, snapTolerance);
                 if (snappedEnd !== null) newStart = snappedEnd - clip.duration;
             }
        }

        // Collision check
         const targetTrack = tracksRecord[targetTrackId];
         if (targetTrack) {
            const trackClips = targetTrack.clips.map(id => clipsRecord[id]).filter(c => c && c.id !== clipId);
            if (checkCollision(newStart, clip.duration, trackClips)) {
                if (!settings.allowOverlaps) {
                    const validStart = findNearestValidTime(newStart, clip.duration, trackClips, 20 / zoomLevel);
                    if (validStart !== null) newStart = validStart;
                    else return; // Cancel move
                }
            }
         }

         moveClip(clipId, newStart, targetTrackId);
    }
    else if (type === 'Asset') {
         const assetId = active.id as string;
         const asset = assetsRecord[assetId];
         const trackId = over.id as string;

         // Use the snapLine we calculated
         if (snapLine !== null && asset) {
              addClip({
                 id: Math.random().toString(36).substr(2, 9),
                 assetId: asset.id,
                 trackId: trackId,
                 start: snapLine,
                 duration: asset.duration || 10,
                 offset: 0,
                 type: asset.type === 'image' ? 'image' : asset.type === 'video' ? 'video' : asset.type === 'audio' ? 'audio' : 'map',
                 properties: {
                     x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0
                 }
             });
         }
    }
  };

  const dropAnimation: DropAnimation = {
      sideEffects: defaultDropAnimationSideEffects({
        styles: {
          active: { opacity: '0.5' },
        },
      }),
  };

  // Add Asset Helper (Button)
  const addAssetToShortestTrack = (assetId: string) => {
      const asset = assetsRecord[assetId];
      if(!asset) return;

      let bestTrackId = null;
      let minEndTime = Infinity;

      if (tracks.length === 0) {
           const newTrackId = Math.random().toString(36).substr(2, 9);
           addTrack({
               id: newTrackId,
               type: 'video',
               label: 'Track 1',
               isMuted: false,
               isLocked: false,
               clips: []
           });
           bestTrackId = newTrackId;
           minEndTime = 0;
      } else {
          tracks.forEach(track => {
              const trackClips = track.clips.map(id => clipsRecord[id]).filter(Boolean);
              let endTime = 0;
              trackClips.forEach(c => {
                  const e = c.start + c.duration;
                  if (e > endTime) endTime = e;
              });

              if (endTime < minEndTime) {
                  minEndTime = endTime;
                  bestTrackId = track.id;
              }
          });
      }

      if (bestTrackId) {
            addClip({
               id: Math.random().toString(36).substr(2, 9),
               assetId: asset.id,
               trackId: bestTrackId,
               start: minEndTime,
               duration: asset.duration || 10,
               offset: 0,
               type: asset.type === 'image' ? 'image' : asset.type === 'video' ? 'video' : asset.type === 'audio' ? 'audio' : 'map',
               properties: {
                   x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0
               }
           });
           showSuccess('Added to timeline');
      }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMoveImproved}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
        <div className="grid h-screen w-screen bg-neutral-900 text-neutral-200 font-sans overflow-hidden"
             style={{
                 gridTemplateAreas: '"header header header" "library preview metadata" "timeline timeline timeline"',
                 gridTemplateColumns: '300px 1fr 300px',
                 gridTemplateRows: '50px 1fr 200px'
             }}>

          {/* Header */}
          <div className="[grid-area:header] border-b border-neutral-700 bg-neutral-800 flex items-center px-4 gap-4">
            <span className="font-bold text-lg">Strata Vid</span>
            <ProjectMenu />
            <EditMenu />

            <div className="ml-auto flex items-center gap-4">
              <Tooltip content="Keyboard Shortcuts (?)">
                <button
                  onClick={toggleHelp}
                  className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-700"
                  aria-label="Help"
                >
                  <HelpCircle size={20} />
                </button>
              </Tooltip>

              <Tooltip content="View Settings">
                <button
                  className="px-3 py-1 text-sm hover:bg-neutral-700 rounded"
                  aria-label="View Settings"
                >
                  View
                </button>
              </Tooltip>

              <Tooltip content="Export Video">
                <button
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 rounded font-medium"
                  onClick={() => setShowExport(true)}
                  aria-label="Export Project"
                >
                  Export
                </button>
              </Tooltip>
            </div>

            <div className="text-xs text-neutral-500 border-l border-neutral-700 pl-4">v0.1.0</div>
          </div>

          {/* Library */}
          <div className="[grid-area:library] border-r border-neutral-700 bg-neutral-800 flex flex-col overflow-hidden" data-testid="library">
            <LibraryPanel
                assets={assets}
                selectedAssetId={selectedAssetId}
                onAssetAdd={handleAssetAdd}
                onAssetSelect={selectAsset}
                onAssetRemove={handleAssetRemove}
                onAssetUpdate={handleAssetUpdate}
                onAddToTimeline={addAssetToShortestTrack}
            />
          </div>

          {/* Preview */}
          <div className="[grid-area:preview] bg-black flex items-center justify-center relative overflow-hidden" data-testid="preview">
            <PreviewPanel />
          </div>

          {/* Metadata */}
          <div className="[grid-area:metadata] border-l border-neutral-700 bg-neutral-800 flex flex-col overflow-hidden" data-testid="metadata">
            <MetadataPanel assets={assets} selectedAssetId={selectedAssetId} settings={settings} setSettings={setSettings} />
          </div>

          {/* Timeline */}
          <div className="[grid-area:timeline] border-t border-neutral-700 bg-neutral-800 flex flex-col overflow-hidden" data-testid="timeline">
            <TimelinePanel
                ref={timelineScrollRef}
                snapLine={snapLine}
                isValidDrop={isValidDrop}
            />
          </div>

          {showExport && <ExportModal onClose={() => setShowExport(false)} />}
          {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
          {confirmModal.isOpen && (
            <ConfirmModal
              title="Remove Asset"
              message="This asset is currently used in your timeline. Removing it will also remove all associated clips. Are you sure?"
              confirmLabel="Remove All"
              onConfirm={confirmAssetRemove}
              onCancel={() => setConfirmModal({ isOpen: false, assetId: null })}
            />
          )}
          <ToastContainer />
          <LoadingOverlay />

          <DragOverlay dropAnimation={dropAnimation}>
            {activeDragType === 'Clip' && activeDragId ? (
               <div style={{ width: clipsRecord[activeDragId]?.duration * zoomLevel }}>
                <ClipItem
                    clip={clipsRecord[activeDragId]}
                    asset={assetsRecord[clipsRecord[activeDragId].assetId]}
                    zoomLevel={zoomLevel}
                    isSelected={true}
                />
               </div>
            ) : activeDragType === 'Asset' && activeDragId ? (
               <div className="bg-blue-600/50 border border-blue-400 rounded p-1 text-xs text-white whitespace-nowrap overflow-hidden"
                    style={{ width: (assetsRecord[activeDragId]?.duration || 10) * zoomLevel }}>
                   {assetsRecord[activeDragId]?.name}
               </div>
            ) : null}
          </DragOverlay>
        </div>
    </DndContext>
  );
}

export default App;
