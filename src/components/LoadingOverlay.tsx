import React from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { Loader2 } from 'lucide-react';

export const LoadingOverlay: React.FC = () => {
  const isLoading = useProjectStore((state) => state.isLoading);
  const loadingMessage = useProjectStore((state) => state.loadingMessage);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-neutral-800 p-6 rounded-lg shadow-xl flex flex-col items-center gap-4 border border-neutral-700">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-neutral-200 font-medium">{loadingMessage || 'Loading...'}</span>
      </div>
    </div>
  );
};
