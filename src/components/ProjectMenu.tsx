/**
 * The File menu: strata-react `Menu` over commands (issue #71), so it opens from the keyboard and
 * reads as a menu, not a hover-only list. Starting a new project over work is a strata
 * `AlertDialog`: the work cannot be brought back, so it is the one confirm here.
 */
import React, { useRef, useState } from 'react';
import { AlertDialog, Button, Menu, type Command } from 'strata-react';
import { FilePlus, FolderOpen, Save } from 'lucide-react';
import { handleError } from '../utils/errorHandler';
import { useProjectStore } from '../store/useProjectStore';
import { serializeProject, deserializeProject } from '../utils/projectSerializer';
import { AssetLoader } from '../services/AssetLoader';

export const ProjectMenu: React.FC = () => {
  const store = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmNew, setConfirmNew] = useState(false);

  const handleNewProject = () => {
    if (Object.keys(store.assets).length > 0 || Object.keys(store.tracks).length > 0) {
      setConfirmNew(true);
      return;
    }
    startNewProject();
  };

  const startNewProject = () => {
    // Cleanup assets
    Object.values(store.assets).forEach(asset => AssetLoader.revokeAsset(asset));

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

      if (Object.keys(store.assets).length > 0) {
        // Cleanup existing assets before loading new ones
        Object.values(store.assets).forEach(asset => AssetLoader.revokeAsset(asset));
      }

      const reader = new FileReader();
      reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
              const state = deserializeProject(content);
              if (state) {
                  store.loadProject(state);
              } else {
                  handleError(new Error(`${file.name} is not a Strata Vid project.`), 'Project not loaded');
              }
          }
      };
      reader.readAsText(file);

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const commands: Command[] = [
    { id: 'new-project', label: 'New project', icon: FilePlus, run: handleNewProject },
    { id: 'save-project', label: 'Save project', icon: Save, run: handleSaveProject },
    { id: 'load-project', label: 'Open project…', icon: FolderOpen, run: () => fileInputRef.current?.click() },
  ];

  return (
    <>
      <Menu label="File" items={commands} trigger={<Button variant="ghost">File</Button>} />
      <AlertDialog
        open={confirmNew}
        onOpenChange={setConfirmNew}
        title="Start a new project?"
        description="The clips, tracks and files in this project are cleared. Save it first to keep it."
        confirm="Start new project"
        onConfirm={() => {
          startNewProject();
          setConfirmNew(false);
        }}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLoadProject}
        accept=".svp,.json"
        className="hidden"
        data-testid="file-input"
      />
    </>
  );
};
