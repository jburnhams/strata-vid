/**
 * The shortcuts dialog: a strata-react `Dialog` around `CommandLegend`, drawn from the same
 * commands the key handler runs, so it lists exactly the keys that work (the hand-written list
 * it replaces had drifted: it never named Mod+Shift+Z). Shortcuts are shown per platform.
 */
import React from 'react';
import { Button, CommandLegend, Dialog, type Command } from 'strata-react';

interface HelpModalProps {
  commands: readonly Command[];
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ commands, onClose }) => (
  <Dialog
    open
    onOpenChange={(open) => !open && onClose()}
    title="Keyboard shortcuts"
    description="They work anywhere in the editor except while typing in a field."
    actions={(close) => <Button onClick={close}>Close</Button>}
  >
    <CommandLegend commands={commands} className="flex-col items-start gap-y-2" />
  </Dialog>
);
