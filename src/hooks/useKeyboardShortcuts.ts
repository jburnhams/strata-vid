/**
 * The editor's commands, declared once (strata-react `Command`, issue #71): the same list binds the
 * keys (`useCommands`), fills the Edit menu, and draws the shortcuts dialog's legend, so a key, a
 * menu item and the help can no longer disagree, as the hand-kept list in HelpModal used to.
 *
 * Undo is always offered: the history middleware keeps no "can undo" flag yet. Document history
 * with real availability is strata-react issue #81, not released; it replaces `historyCommands`.
 */
import { useMemo, useRef } from 'react';
import { useCommands, type Command } from 'strata-react';
import { Pause, Play, Redo2, Trash2, Undo2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';

type History = { undo: () => void; redo: () => void };
const history = () => useProjectStore as unknown as History;

/** Undo and redo, for the Edit menu and the key handler. */
export const historyCommands: Command[] = [
  { id: 'undo', label: 'Undo', icon: Undo2, keys: ['Mod+Z'], run: () => history().undo() },
  { id: 'redo', label: 'Redo', icon: Redo2, keys: ['Mod+Y', 'Mod+Shift+Z'], run: () => history().redo() },
];

/**
 * Every command the editor binds to keys. `onToggleHelp` opens and closes the shortcuts dialog.
 * Commands read the store when they run, so the list only changes with what it shows.
 */
export const useEditorCommands = (onToggleHelp?: () => void): Command[] => {
  const isPlaying = useProjectStore((state) => state.isPlaying);
  const hasSelectedClip = useProjectStore((state) => state.selectedClipId !== null);
  // Space and K both toggle; a second toggle inside 200ms is dropped, so a bouncing key or a
  // doubled event does not start and stop playback at once.
  const lastToggleTimeRef = useRef(0);

  return useMemo(() => {
    const store = () => useProjectStore.getState();
    const seek = (to: (time: number, duration: number, frame: number) => number, pause = false) => () => {
      const state = store();
      const frame = 1 / (state.settings.fps || 30);
      const currentTime = Math.min(state.settings.duration, Math.max(0, to(state.currentTime, state.settings.duration, frame)));
      state.setPlaybackState(pause ? { isPlaying: false, currentTime } : { currentTime });
    };

    const commands: Command[] = [
      {
        id: 'play',
        label: isPlaying ? 'Pause' : 'Play',
        icon: isPlaying ? Pause : Play,
        keys: [' ', 'K'],
        run: () => {
          const now = Date.now();
          if (now - lastToggleTimeRef.current <= 200) return;
          lastToggleTimeRef.current = now;
          store().setPlaybackState({ isPlaying: !store().isPlaying });
        },
      },
      { id: 'back-second', label: 'Back 1 second', keys: ['J'], run: seek((t) => t - 1) },
      { id: 'forward-second', label: 'Forward 1 second', keys: ['L'], run: seek((t) => t + 1) },
      { id: 'previous-frame', label: 'Previous frame', keys: ['ArrowLeft'], repeat: true, run: seek((t, _d, f) => t - f, true) },
      { id: 'next-frame', label: 'Next frame', keys: ['ArrowRight'], repeat: true, run: seek((t, _d, f) => t + f, true) },
      { id: 'go-to-start', label: 'Go to start', keys: ['Home'], run: seek(() => 0) },
      { id: 'go-to-end', label: 'Go to end', keys: ['End'], run: seek((_t, d) => d) },
      {
        id: 'delete-clip',
        label: 'Delete clip',
        icon: Trash2,
        keys: ['Delete', 'Backspace'],
        destructive: true,
        disabled: hasSelectedClip ? false : 'No clip selected',
        run: () => {
          const id = store().selectedClipId;
          if (id) store().removeClip(id);
        },
      },
      ...historyCommands,
    ];
    if (onToggleHelp) {
      commands.push({ id: 'shortcuts', label: 'Keyboard shortcuts', keys: ['?'], run: onToggleHelp });
    }
    return commands;
  }, [isPlaying, hasSelectedClip, onToggleHelp]);
};

/** Binds the editor's commands to their keys on the window. Never while typing in a field. */
export const useKeyboardShortcuts = (onToggleHelp?: () => void): Command[] => {
  const commands = useEditorCommands(onToggleHelp);
  useCommands(commands);
  return commands;
};
