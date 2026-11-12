import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectMenu } from '../../../src/components/ProjectMenu';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { serializeProject } from '../../../src/utils/projectSerializer';
import '@testing-library/jest-dom';

// Mock the store
jest.mock('../../../src/store/useProjectStore');

// Mock project serializer
jest.mock('../../../src/utils/projectSerializer', () => ({
  serializeProject: jest.fn(),
  deserializeProject: jest.fn(),
}));

// Mock URL and Blob
window.URL.createObjectURL = jest.fn();
window.URL.revokeObjectURL = jest.fn();

describe('ProjectMenu', () => {
  const mockStore = {
    assets: {},
    tracks: {},
    settings: { width: 1920, height: 1080 },
    setSettings: jest.fn(),
    removeAsset: jest.fn(),
    removeTrack: jest.fn(),
    addAsset: jest.fn(),
    addTrack: jest.fn(),
    addClip: jest.fn(),
    loadProject: jest.fn(),
  };

  beforeEach(() => {
    (useProjectStore as unknown as jest.Mock).mockReturnValue(mockStore);
    jest.restoreAllMocks();
    (serializeProject as jest.Mock).mockReturnValue('{"mock":"json"}');
  });

  it('renders correctly', () => {
    render(<ProjectMenu />);
    expect(screen.getByRole('button', { name: 'File' })).toBeInTheDocument();
  });

  it('handles Save Project', async () => {
    render(<ProjectMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'File' }));
    const save = screen.getByRole('menuitem', { name: 'Save project' });

    // Mock anchor click
    const link = { click: jest.fn(), href: '', download: '' };
    jest.spyOn(document, 'createElement').mockReturnValue(link as unknown as HTMLElement);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => link as unknown as HTMLElement);
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => link as unknown as HTMLElement);

    fireEvent.click(save);

    expect(serializeProject).toHaveBeenCalledWith(mockStore);
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(link.download).toMatch(/project-.*\.svp/);
    expect(link.click).toHaveBeenCalled();
  });

  it('handles New Project', async () => {
    // With assets/tracks, it asks first: the work cannot be brought back
    mockStore.assets = { '1': {} };

    render(<ProjectMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'File' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'New project' }));

    expect(mockStore.removeAsset).not.toHaveBeenCalled();
    const confirm = await screen.findByRole('alertdialog', { name: 'Start a new project?' });
    expect(confirm).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start new project' }));

    // One load of an empty project, so the undo history starts again
    expect(mockStore.loadProject).toHaveBeenCalledWith(expect.objectContaining({ assets: {}, tracks: {}, clips: {}, trackOrder: [] }));
  });

  it('handles Load Project', async () => {
    const { deserializeProject } = require('../../../src/utils/projectSerializer');
    const mockState = {
      settings: { width: 1280, height: 720 },
      assets: { 'a1': { id: 'a1' } },
      tracks: { 't1': { id: 't1', clips: ['c1'] } },
      clips: { 'c1': { id: 'c1' } },
      trackOrder: ['t1'],
    };
    deserializeProject.mockReturnValue(mockState);

    render(<ProjectMenu />);
    const fileInput = screen.getByTestId('file-input');

    const file = new File(['{}'], 'project.svp', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(deserializeProject).toHaveBeenCalled();
      expect(mockStore.loadProject).toHaveBeenCalledWith(mockState);
    });
  });
});
