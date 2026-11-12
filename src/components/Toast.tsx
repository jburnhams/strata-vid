import React, { useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import type { Toast as ToastType } from '../store/types';

const ToastItem: React.FC<{ toast: ToastType; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success" />,
    error: <AlertCircle className="w-5 h-5 text-danger" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning" />,
    info: <Info className="w-5 h-5 text-primary" />,
  };

  const borderColors = {
    success: 'border-success',
    error: 'border-danger',
    warning: 'border-warning',
    info: 'border-primary',
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-control shadow-overlay border-l-4 min-w-[300px] bg-card ${borderColors[toast.type]} text-foreground`}>
      {icons[toast.type]}
      <p className="type-body-sm flex-1">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useProjectStore((state) => state.toasts);
  const removeToast = useProjectStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </div>
  );
};
