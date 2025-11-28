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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onCancel} data-testid="confirm-modal-overlay">
      <div
        className="bg-neutral-800 rounded-xl w-[400px] text-white shadow-2xl border border-neutral-700 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-testid="confirm-modal"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-800">
          <h2 className="text-lg font-bold flex items-center gap-2 text-yellow-500">
            <AlertTriangle size={20} />
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-neutral-300 text-sm">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-neutral-700 flex justify-end gap-2">
            <button
                onClick={onCancel}
                className="px-4 py-2 hover:bg-neutral-700 rounded text-neutral-300 font-medium text-sm transition-colors"
            >
                {cancelLabel}
            </button>
            <button
                onClick={onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white font-medium text-sm transition-colors"
                data-testid="confirm-modal-confirm-btn"
            >
                {confirmLabel}
            </button>
        </div>
      </div>
    </div>
  );
};
