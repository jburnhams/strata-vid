/**
 * Brightness, contrast and saturation for a video or image clip (H7), in the inspector. The clip's
 * `filter` was already drawn by the preview and the export; until 2026-11-12 nothing set it. Each is
 * a slider from 0% to 200% of the original with a reset, and a drag is one undo step.
 */
import React from 'react';
import { PropertyRow, Slider } from 'strata-react';
import { useProjectStore } from '../store/useProjectStore';
import { readColour, writeColour, type ColourAdjustments } from '../utils/colourFilter';
import type { Clip } from '../types';

const ROWS: { key: keyof ColourAdjustments; label: string }[] = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast', label: 'Contrast' },
  { key: 'saturate', label: 'Saturation' },
];

export const ClipColourRows: React.FC<{ clip: Clip }> = ({ clip }) => {
  const colour = readColour(clip.properties.filter);
  const set = (key: keyof ColourAdjustments, value: number) => {
    useProjectStore.getState().updateClipProperties(clip.id, { filter: writeColour(clip.properties.filter, { ...colour, [key]: value }) });
  };
  return (
    <>
      {ROWS.map(({ key, label }) => (
        <PropertyRow key={key} label={label} modified={colour[key] !== 1} onReset={() => set(key, 1)}>
          <Slider min={0} max={200} unit="%" value={Math.round(colour[key] * 100)} onChange={(v) => set(key, v / 100)} />
        </PropertyRow>
      ))}
    </>
  );
};
