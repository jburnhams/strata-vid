import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-scrim/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onCancel} data-testid="confirm-modal-overlay">
      <div
        className="bg-card rounded-overlay w-[400px] text-foreground shadow-overlay border border-border flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-testid="confirm-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card">
          <h2 className="type-heading font-bold flex items-center gap-2 text-warning">
            <AlertTriangle size={20} />
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-foreground type-body-sm">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border flex justify-end gap-2">
            <button
                onClick={onCancel}
                className="px-4 py-2 hover:bg-muted rounded-control text-foreground font-medium type-body-sm transition-state"
            >
                {cancelLabel}
            </button>
            <button
                onClick={onConfirm}
                className="px-4 py-2 bg-destructive hover:bg-destructive rounded-control text-foreground font-medium type-body-sm transition-state"
                data-testid="confirm-modal-confirm-btn"
            >
                {confirmLabel}
            </button>
        </div>
      </div>
    </div>
  );
};
