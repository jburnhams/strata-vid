import React, { useState, useEffect } from 'react';
import { ExportManager, ExportProgress } from '../services/ExportManager';
import { useProjectStore } from '../store/useProjectStore';

interface ExportModalProps {
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [manager] = useState(() => new ExportManager());

  // We need the current state, but we don't want to re-render if it changes during export
  // We just capture it once.
  const projectState = useProjectStore.getState();

  useEffect(() => {
    // Start export
    const runExport = async () => {
        try {
            const blob = await manager.exportProject(
                {
                    id: projectState.id,
                    settings: projectState.settings,
                    assets: projectState.assets,
                    tracks: projectState.tracks,
                    clips: projectState.clips,
                    trackOrder: projectState.trackOrder
                },
                setProgress
            );
            if (blob) {
                // Download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `strata-project-${new Date().getTime()}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error('Export error:', e);
        }
    };

    // Defer slightly to allow UI to mount
    setTimeout(runExport, 100);

    return () => {
        manager.cancel();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-neutral-800 p-6 rounded-lg w-96 text-white shadow-xl border border-neutral-700">
        <h2 className="text-xl font-bold mb-4">Exporting Project</h2>

        {progress ? (
            <div className="space-y-4">
                <div className="flex justify-between text-xs text-neutral-400">
                    <span>{progress.status === 'initializing' ? 'Initializing...' :
                           progress.status === 'encoding' ? 'Encoding...' :
                           progress.status === 'completed' ? 'Done' :
                           progress.status === 'cancelled' ? 'Cancelled' :
                           progress.status === 'error' ? 'Failed' :
                           `Rendering Frame ${progress.currentFrame} / ${progress.totalFrames}`}
                    </span>
                    <span>{Math.round(progress.percentage)}%</span>
                </div>

                <div className="w-full bg-neutral-700 h-2 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${
                            progress.status === 'error' ? 'bg-red-500' :
                            progress.status === 'completed' ? 'bg-green-500' :
                            'bg-blue-500'
                        }`}
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>

                {progress.status === 'completed' && (
                    <div className="text-green-500 font-bold text-center py-2">Export Complete!</div>
                )}
                {progress.status === 'error' && (
                    <div className="text-red-500 font-bold text-center py-2 text-sm">Error: {progress.error}</div>
                )}
            </div>
        ) : (
            <div className="text-neutral-400 text-sm">Starting export engine...</div>
        )}

        <div className="mt-6 flex justify-end gap-2">
            {progress?.status === 'completed' || progress?.status === 'error' || progress?.status === 'cancelled' ? (
                <button onClick={onClose} className="px-4 py-2 bg-neutral-600 hover:bg-neutral-500 rounded text-sm font-medium">Close</button>
            ) : (
                <button onClick={() => { manager.cancel(); onClose(); }} className="px-4 py-2 bg-red-600/80 hover:bg-red-500 rounded text-sm font-medium">Cancel</button>
            )}
        </div>
      </div>
    </div>
  );
};
