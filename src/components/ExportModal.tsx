/**
 * Export: a strata-react `Dialog` (issue #70) with the settings as `Field`s, `NumberField`s with
 * their units (issue #73), and the run as a `JobStatus` (issue #72), the same way strata shows any
 * long job: a required word for each state, the app's sentence, a bar, Cancel while it runs.
 * The dialog cannot be dismissed while it renders (`closable={false}`); Cancel stops the job.
 */
import React, { useState, useEffect } from 'react';
import { ExportManager, type ExportProgress, type ExportSettings } from '../services/ExportManager';
import { useProjectStore } from '../store/useProjectStore';
import { Button, Dialog, Disclosure, Field, JobStatus, NativeSelect, NumberField, ToggleGroup } from 'strata-react';

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

  const preset = PRESETS.find(p => settings.width === p.width && settings.height === p.height);
  const running = step === 'progress' && (!progress || ['initializing', 'rendering', 'encoding'].includes(progress.status));
  const summary = !progress || progress.status === 'initializing'
    ? 'Starting the export engine.'
    : progress.status === 'error'
      ? progress.error ?? 'The export stopped.'
      : progress.status === 'completed'
        ? [`Saved ${progress.totalFrames} frames to your downloads.`, ...(progress.notes ?? [])].join(' ')
        : `${progress.status === 'encoding' ? 'Encoding' : 'Rendering'} frame ${progress.currentFrame} of ${progress.totalFrames}.`;

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={step === 'settings' ? 'Export video' : 'Exporting video'}
      closable={!running}
      size="md"
      actions={step === 'settings'
        ? (close) => (
            <>
              <Button onClick={close}>Cancel</Button>
              <Button variant="default" onClick={handleExport}>Export</Button>
            </>
          )
        : running
          ? undefined
          : (close) => <Button onClick={close}>Close</Button>}
    >
      {step === 'settings' ? (
        <div className="space-y-5">
          <ToggleGroup
            label="Resolution preset"
            value={preset?.name ?? 'custom'}
            onChange={(name) => {
              const p = PRESETS.find(p => p.name === name);
              if (p) handlePresetChange(p.width, p.height, p.bitrate);
            }}
            options={[...PRESETS.map(p => ({ value: p.name, label: p.name })), { value: 'custom', label: 'Custom' }]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Container format" id="export-format" hint={settings.format === 'mp4' ? 'Plays everywhere.' : 'Open formats; not every player opens it.'}>
              <NativeSelect value={settings.format} onChange={e => handleFormatChange(e.target.value as 'mp4' | 'webm')}>
                <option value="mp4">MP4</option>
                <option value="webm">WebM</option>
              </NativeSelect>
            </Field>
            <Field label="Frame rate" id="export-fps">
              <NativeSelect value={settings.fps} onChange={e => setSettings({ ...settings, fps: Number(e.target.value) })}>
                <option value="24">24 fps</option>
                <option value="30">30 fps</option>
                <option value="60">60 fps</option>
              </NativeSelect>
            </Field>
            <Field label="Width" id="export-width">
              <NumberField min={16} max={7680} unit="px" value={settings.width} onChange={v => v !== null && setSettings({ ...settings, width: v })} />
            </Field>
            <Field label="Height" id="export-height">
              <NumberField min={16} max={4320} unit="px" value={settings.height} onChange={v => v !== null && setSettings({ ...settings, height: v })} />
            </Field>
          </div>

          <Disclosure summary="Encoding">
            <div className="grid grid-cols-2 gap-4 pt-3">
              <Field label="Video codec" id="export-video-codec">
                <NativeSelect value={settings.videoCodec} onChange={e => setSettings({ ...settings, videoCodec: e.target.value as ExportSettings['videoCodec'] })}>
                  <option value="avc">H.264 (AVC)</option>
                  <option value="hevc">H.265 (HEVC)</option>
                  <option value="vp9">VP9</option>
                  <option value="av1">AV1</option>
                </NativeSelect>
              </Field>
              <Field label="Video bitrate" id="export-video-bitrate">
                <NumberField min={1} max={200} unit="Mbps" value={Math.round((settings.videoBitrate || 6_000_000) / 1_000_000)} onChange={v => v !== null && setSettings({ ...settings, videoBitrate: v * 1_000_000 })} />
              </Field>
              <Field label="Audio codec" id="export-audio-codec">
                <NativeSelect value={settings.audioCodec} onChange={e => setSettings({ ...settings, audioCodec: e.target.value as ExportSettings['audioCodec'] })}>
                  <option value="aac">AAC</option>
                  <option value="opus">Opus</option>
                </NativeSelect>
              </Field>
              <Field label="Audio bitrate" id="export-audio-bitrate">
                <NumberField min={32} max={512} unit="kbps" value={(settings.audioBitrate || 128_000) / 1000} onChange={v => v !== null && setSettings({ ...settings, audioBitrate: v * 1000 })} />
              </Field>
            </div>
          </Disclosure>
        </div>
      ) : (
        <JobStatus
          label="Video export"
          running={running}
          words={{ running: progress?.status === 'encoding' ? 'Encoding' : 'Rendering', finished: 'Exported', failed: 'Export failed' }}
          summary={summary}
          current={progress?.totalFrames ? progress.currentFrame : undefined}
          total={progress?.totalFrames || undefined}
          failed={progress?.status === 'error'}
          cancelled={progress?.status === 'cancelled'}
          onCancel={() => { manager.cancel(); onClose(); }}
        />
      )}
    </Dialog>
  );
};
