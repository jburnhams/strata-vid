import React from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { Loader2 } from 'lucide-react';

export const LoadingOverlay: React.FC = () => {
  const isLoading = useProjectStore((state) => state.isLoading);
  const loadingMessage = useProjectStore((state) => state.loadingMessage);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 layer-overlay bg-scrim/50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-card p-6 rounded-surface shadow-overlay flex flex-col items-center gap-4 border border-border">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-foreground font-medium">{loadingMessage || 'Loading...'}</span>
      </div>
    </div>
  );
};
