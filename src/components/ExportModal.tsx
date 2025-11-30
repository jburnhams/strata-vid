import React, { useState, useEffect } from 'react';
import { ExportManager, ExportProgress, ExportSettings } from '../services/ExportManager';
import { useProjectStore } from '../store/useProjectStore';
import { Download, Settings, AlertCircle, CheckCircle, XCircle, X, ChevronDown, ChevronRight } from 'lucide-react';

interface ExportModalProps {
  onClose: () => void;
}

const PRESETS = [
    { name: '720p HD', width: 1280, height: 720, bitrate: 4_000_000 },
    { name: '1080p Full HD', width: 1920, height: 1080, bitrate: 8_000_000 },
    { name: '4K UHD', width: 3840, height: 2160, bitrate: 20_000_000 },
];

export const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const [step, setStep] = useState<'settings' | 'progress'>('settings');
  const [manager] = useState(() => new ExportManager());
  const [showAdvanced, setShowAdvanced] = useState(false);

  const projectState = useProjectStore.getState();

  const [settings, setSettings] = useState<ExportSettings>({
    width: projectState.settings.width,
    height: projectState.settings.height,
    fps: projectState.settings.fps,
    videoBitrate: 6_000_000,
    format: 'mp4',
    videoCodec: 'avc',
    audioCodec: 'aac',
    audioBitrate: 128_000
  });

  const [progress, setProgress] = useState<ExportProgress | null>(null);

  const handlePresetChange = (width: number, height: number, bitrate: number) => {
      setSettings(s => ({ ...s, width, height, videoBitrate: bitrate }));
  };

  const handleFormatChange = (format: 'mp4' | 'webm') => {
      setSettings(s => ({
          ...s,
          format,
          // Set sensible defaults for the selected format
          videoCodec: format === 'webm' ? 'vp9' : 'avc',
          audioCodec: format === 'webm' ? 'opus' : 'aac'
      }));
  };

  const handleExport = async () => {
     setStep('progress');
     try {
        const blob = await manager.exportProject({
             id: projectState.id,
             settings: projectState.settings,
             assets: projectState.assets,
             tracks: projectState.tracks,
             clips: projectState.clips,
             trackOrder: projectState.trackOrder
        }, settings, setProgress);

        if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ext = settings.format === 'webm' ? 'webm' : 'mp4';
            a.download = `strata-${projectState.id || 'project'}-${new Date().toISOString().slice(0,10)}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
     } catch (e) {
         console.error("Export error", e);
     }
  };

  useEffect(() => {
      return () => {
          manager.cancel();
      };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-neutral-800 rounded-xl w-[520px] text-white shadow-2xl border border-neutral-700 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-800 shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
                {step === 'settings' ? <Settings size={20} /> : <Download size={20} />}
                {step === 'settings' ? 'Export Settings' : 'Exporting Project'}
            </h2>
            {step === 'settings' && (
                <button onClick={onClose} className="text-neutral-400 hover:text-white">
                    <X size={20} />
                </button>
            )}
        </div>

        {step === 'settings' ? (
            <div className="overflow-y-auto flex-1">
                <div className="p-6 space-y-6">
                    {/* Presets */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Resolution Preset</label>
                        <div className="grid grid-cols-3 gap-2">
                            {PRESETS.map(p => (
                                <button
                                    key={p.name}
                                    onClick={() => handlePresetChange(p.width, p.height, p.bitrate)}
                                    className={`px-3 py-2 rounded text-sm font-medium border transition-colors ${
                                        settings.width === p.width && settings.height === p.height
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600'
                                    }`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Settings */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-neutral-400">Container Format</label>
                                <select
                                    value={settings.format}
                                    onChange={e => handleFormatChange(e.target.value as any)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                >
                                    <option value="mp4">MP4 (Standard)</option>
                                    <option value="webm">WebM (Open Web)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-neutral-400">FPS</label>
                                <select
                                    value={settings.fps}
                                    onChange={e => setSettings({...settings, fps: Number(e.target.value)})}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                >
                                    <option value="24">24 fps</option>
                                    <option value="30">30 fps</option>
                                    <option value="60">60 fps</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-neutral-400">Width</label>
                                <input
                                    type="number"
                                    value={settings.width}
                                    onChange={e => setSettings({...settings, width: Number(e.target.value)})}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-neutral-400">Height</label>
                                <input
                                    type="number"
                                    value={settings.height}
                                    onChange={e => setSettings({...settings, height: Number(e.target.value)})}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Advanced Toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white uppercase tracking-wider w-full pt-2 border-t border-neutral-700"
                    >
                        {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Advanced Settings
                    </button>

                    {/* Advanced Settings */}
                    {showAdvanced && (
                        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-2">
                                <label className="text-xs text-neutral-400 font-bold">Video Encoding</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-neutral-500">Codec</label>
                                        <select
                                            value={settings.videoCodec}
                                            onChange={e => setSettings({...settings, videoCodec: e.target.value as any})}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                        >
                                            <option value="avc">H.264 (AVC)</option>
                                            <option value="hevc">H.265 (HEVC)</option>
                                            <option value="vp9">VP9</option>
                                            <option value="av1">AV1</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-neutral-500">Bitrate (Mbps)</label>
                                        <input
                                            type="number"
                                            value={Math.round((settings.videoBitrate || 6000000) / 1000000)}
                                            onChange={e => setSettings({...settings, videoBitrate: Number(e.target.value) * 1000000})}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-neutral-400 font-bold">Audio Encoding</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-neutral-500">Codec</label>
                                        <select
                                            value={settings.audioCodec}
                                            onChange={e => setSettings({...settings, audioCodec: e.target.value as any})}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                        >
                                            <option value="aac">AAC</option>
                                            <option value="opus">Opus</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-neutral-500">Bitrate (kbps)</label>
                                        <input
                                            type="number"
                                            value={(settings.audioBitrate || 128000) / 1000}
                                            onChange={e => setSettings({...settings, audioBitrate: Number(e.target.value) * 1000})}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3 border-t border-neutral-700">
                        <button onClick={onClose} className="px-4 py-2 text-neutral-300 hover:text-white font-medium">Cancel</button>
                        <button
                            onClick={handleExport}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium shadow-lg shadow-blue-900/20"
                        >
                            Start Export
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            <div className="p-6 space-y-6 flex-1 flex flex-col justify-center">
                {/* Progress View */}
                {progress ? (
                    <div className="space-y-4">
                         <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                 {progress.status === 'rendering' && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                                 {progress.status === 'encoding' && <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />}
                                 {progress.status === 'completed' && <CheckCircle size={16} className="text-green-500" />}
                                 {progress.status === 'error' && <AlertCircle size={16} className="text-red-500" />}
                                 <span className="text-sm font-medium capitalize">
                                     {progress.status === 'initializing' ? 'Initializing...' :
                                      progress.status === 'encoding' ? 'Encoding...' :
                                      progress.status === 'completed' ? 'Done' :
                                      progress.status === 'cancelled' ? 'Cancelled' :
                                      progress.status === 'error' ? 'Failed' :
                                      'Rendering...'}
                                 </span>
                             </div>
                             <span className="text-sm font-mono text-neutral-400">{Math.round(progress.percentage)}%</span>
                         </div>

                         <div className="w-full bg-neutral-700 h-3 rounded-full overflow-hidden relative">
                             <div
                                className={`h-full transition-all duration-300 ease-out ${
                                    progress.status === 'completed' ? 'bg-green-500' :
                                    progress.status === 'error' ? 'bg-red-500' :
                                    'bg-blue-500'
                                }`}
                                style={{ width: `${progress.percentage}%` }}
                             />
                         </div>

                         <div className="text-center text-xs text-neutral-500">
                             Frame {progress.currentFrame} / {progress.totalFrames}
                         </div>

                         {progress.status === 'completed' && (
                             <div className="text-green-500 font-bold text-center py-2">Export Complete!</div>
                         )}

                         {progress.status === 'error' && (
                             <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-red-200 text-xs">
                                 {progress.error}
                             </div>
                         )}
                    </div>
                ) : (
                    <div className="text-center text-neutral-400 py-8">Initializing export engine...</div>
                )}

                <div className="flex justify-end mt-4">
                    {progress?.status === 'completed' ? (
                        <button onClick={onClose} className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-white font-medium">Close</button>
                    ) : (
                        <button
                            onClick={() => { manager.cancel(); onClose(); }}
                            className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded font-medium"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
