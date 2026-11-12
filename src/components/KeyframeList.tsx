import React from 'react';
import { useProjectStore } from '../store/useProjectStore';
import type { Keyframe } from '../types';
import { Trash2, Plus } from 'lucide-react';
import { formatTime } from '../utils/timeUtils';
import { interpolateValue } from '../utils/animationUtils';

interface KeyframeListProps {
  clipId: string;
  property: string; // e.g., 'opacity', 'x', 'y'
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

export const KeyframeList: React.FC<KeyframeListProps> = ({ clipId, property, label, min, max, step }) => {
  const clip = useProjectStore((state) => state.clips[clipId]);
  const currentTime = useProjectStore((state) => state.currentTime);
  const addKeyframe = useProjectStore((state) => state.addKeyframe);
  const removeKeyframe = useProjectStore((state) => state.removeKeyframe);
  const updateKeyframe = useProjectStore((state) => state.updateKeyframe);

  if (!clip) return null;

  const keyframes = clip.keyframes?.[property] || [];

  const handleAddKeyframe = () => {
    const relativeTime = Math.max(0, Math.min(clip.duration, currentTime - clip.start));

    // Get current value
    const staticVal = (clip.properties as any)[property];
    const currentVal = interpolateValue(keyframes, relativeTime, staticVal !== undefined ? staticVal : 0);

    const newKeyframe: Keyframe = {
      id: crypto.randomUUID(),
      time: relativeTime,
      value: currentVal,
      easing: 'linear'
    };

    addKeyframe(clipId, property, newKeyframe);
  };

  return (
    <div className="mb-4 bg-background rounded-control p-2 border border-border" data-testid={`keyframe-list-${property}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="type-caption text-muted-foreground font-bold uppercase tracking-wider">{label}</label>
        <button
          onClick={handleAddKeyframe}
          className="p-1 hover:bg-muted rounded-control text-primary transition-state"
          title="Add Keyframe at Playhead"
        >
          <Plus size={14} />
        </button>
      </div>

      {keyframes.length === 0 ? (
        <div className="type-caption text-muted-foreground italic px-2">No keyframes</div>
      ) : (
        <div className="space-y-1">
          {keyframes.map((kf) => (
            <div key={kf.id} className="flex items-center gap-2 type-caption bg-card p-1 rounded-control group">
              <span className="text-muted-foreground w-12 font-mono">{formatTime(kf.time)}</span>
              <input
                type="number"
                value={parseFloat(kf.value.toFixed(2))}
                onChange={(e) => updateKeyframe(clipId, property, kf.id, { value: parseFloat(e.target.value) })}
                className="w-16 bg-background border border-border rounded-control px-1 py-0.5 text-foreground focus:border-primary outline-none"
                step={step}
              />
              <select
                value={kf.easing}
                onChange={(e) => updateKeyframe(clipId, property, kf.id, { easing: e.target.value as any })}
                className="flex-1 bg-background border border-border rounded-control px-1 py-0.5 text-foreground outline-none"
              >
                 <option value="linear">Lin</option>
                 <option value="ease-in">In</option>
                 <option value="ease-out">Out</option>
                 <option value="ease-in-out">InOut</option>
              </select>
              <button
                onClick={() => removeKeyframe(clipId, property, kf.id)}
                className="text-muted-foreground hover:text-danger transition-state opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
