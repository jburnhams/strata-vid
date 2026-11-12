/**
 * A clip's colour adjustments (H7) as the CSS filter both renderers already apply: the preview as the
 * element's `filter`, the export as the canvas context's `filter`. Three adjustments, each a share of
 * the original (1 is unchanged); not a filter library. Other filter functions in a clip's string (from
 * a project made before 2026-11-12) are kept as they are.
 */
export type ColourAdjustments = { brightness: number; contrast: number; saturate: number };

export const NO_ADJUSTMENT: ColourAdjustments = { brightness: 1, contrast: 1, saturate: 1 };
const NAMES = ['brightness', 'contrast', 'saturate'] as const;
const FUNCTION = /([a-z-]+)\(([^)]*)\)/g;

/** Reads the three adjustments from a CSS filter string; a missing one is 1. */
export function readColour(filter: string | undefined): ColourAdjustments {
  const out = { ...NO_ADJUSTMENT };
  for (const [, name, arg] of (filter ?? '').matchAll(FUNCTION)) {
    if (!(NAMES as readonly string[]).includes(name)) continue;
    const value = arg.trim().endsWith('%') ? parseFloat(arg) / 100 : parseFloat(arg);
    if (Number.isFinite(value)) out[name as keyof ColourAdjustments] = value;
  }
  return out;
}

/** Writes the adjustments into a filter string, keeping any other functions; undefined when nothing is left. */
export function writeColour(filter: string | undefined, colour: ColourAdjustments): string | undefined {
  const others = [...(filter ?? '').matchAll(FUNCTION)].filter(([, name]) => !(NAMES as readonly string[]).includes(name)).map(([all]) => all);
  const ours = NAMES.filter((name) => colour[name] !== 1).map((name) => `${name}(${+colour[name].toFixed(2)})`);
  const all = [...ours, ...others];
  return all.length ? all.join(' ') : undefined;
}
