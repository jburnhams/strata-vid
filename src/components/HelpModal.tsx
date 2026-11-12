import React from 'react';
import { X, Keyboard, HelpCircle } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const shortcuts = [
    { keys: ['Space', 'K'], description: 'Play / Pause' },
    { keys: ['J'], description: 'Rewind 1s' },
    { keys: ['L'], description: 'Forward 1s' },
    { keys: ['←', '→'], description: 'Previous / Next Frame' },
    { keys: ['Home'], description: 'Go to Start' },
    { keys: ['End'], description: 'Go to End' },
    { keys: ['Del', 'Backspace'], description: 'Delete Selected Clip' },
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Y'], description: 'Redo' },
    { keys: ['?'], description: 'Show Help' },
  ];

  return (
    <div className="fixed inset-0 bg-scrim/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card rounded-overlay w-[500px] text-foreground shadow-overlay border border-border flex flex-col overflow-hidden max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card">
          <h2 className="type-heading font-bold flex items-center gap-2">
            <HelpCircle size={20} className="text-primary" />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close Help"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="space-y-4">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <span className="text-foreground type-body-sm">{shortcut.description}</span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key, i) => (
                    <kbd
                      key={i}
                      className="px-2 py-1 bg-muted rounded-control type-caption font-mono text-foreground border border-input shadow-overlay min-w-[24px] text-center"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-muted/30 rounded-control border border-border type-caption text-muted-foreground flex gap-3">
             <Keyboard size={16} />
             <p>Use these shortcuts to navigate the timeline and edit your project efficiently.</p>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end">
            <button
                onClick={onClose}
                className="px-4 py-2 bg-muted hover:bg-neutral-5 rounded-control text-foreground font-medium type-body-sm"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};
