import React from 'react';
import { useProjectStore } from '../store/useProjectStore';

export const EditMenu: React.FC = () => {
  // Cast store to access undo/redo attached by middleware
  const store = useProjectStore as unknown as { undo: () => void, redo: () => void };

  return (
    <div className="relative group z-50">
      <button className="px-3 py-1 text-sm hover:bg-neutral-700 rounded">Edit</button>
      <div className="absolute left-0 top-full mt-1 w-48 bg-neutral-800 border border-neutral-700 rounded shadow-lg hidden group-hover:block">
        <button onClick={() => store.undo()} className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-700">Undo</button>
        <button onClick={() => store.redo()} className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-700">Redo</button>
      </div>
    </div>
  );
};
