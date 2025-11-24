import React, { useRef } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { serializeProject, deserializeProject } from '../utils/projectSerializer';

export const ProjectMenu: React.FC = () => {
  const store = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewProject = () => {
    if (Object.keys(store.assets).length > 0 || Object.keys(store.tracks).length > 0) {
        if (!window.confirm('Are you sure you want to create a new project? Unsaved changes will be lost.')) {
            return;
        }
    }

    // Clear existing project
    Object.keys(store.assets).forEach(id => store.removeAsset(id));
    Object.keys(store.tracks).forEach(id => store.removeTrack(id));
    store.setSettings({ width: 1920, height: 1080, fps: 30, duration: 60 });
  };

  const handleSaveProject = () => {
      const json = serializeProject(store);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${new Date().toISOString().slice(0, 10)}.svp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
              const state = deserializeProject(content);
              if (state) {
                  store.loadProject(state);
              } else {
                  alert('Failed to load project: Invalid file format');
              }
          }
      };
      reader.readAsText(file);

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="relative group z-50">
      <button className="px-3 py-1 text-sm hover:bg-neutral-700 rounded">File</button>
      <div className="absolute left-0 top-full mt-1 w-48 bg-neutral-800 border border-neutral-700 rounded shadow-lg hidden group-hover:block">
        <button onClick={handleNewProject} className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-700">New Project</button>
        <button onClick={handleSaveProject} className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-700">Save Project</button>
        <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-700">Load Project</button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLoadProject}
        accept=".svp,.json"
        className="hidden"
        data-testid="file-input"
      />
    </div>
  );
};
