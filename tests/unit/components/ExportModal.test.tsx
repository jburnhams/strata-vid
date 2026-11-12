import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExportModal } from '../../../src/components/ExportModal';
import { ExportManager } from '../../../src/services/ExportManager';

// Mock ExportManager
jest.mock('../../../src/services/ExportManager');

// Mock Store
jest.mock('../../../src/store/useProjectStore', () => ({
  useProjectStore: {
    getState: jest.fn(() => ({
      id: 'test-project',
      settings: { width: 1280, height: 720, fps: 30 },
      assets: {},
      tracks: {},
      clips: {},
      trackOrder: []
    }))
  }
}));

describe('ExportModal', () => {
  const mockExportProject = jest.fn();
  const mockCancel = jest.fn();

  beforeEach(() => {
    (ExportManager as jest.Mock).mockImplementation(() => ({
      exportProject: mockExportProject,
      cancel: mockCancel
    }));
    mockExportProject.mockResolvedValue(new Blob(['test'], { type: 'video/mp4' }));

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const field = (name: string) => screen.getByRole('textbox', { name });

  it('renders correctly with default settings', () => {
    render(<ExportModal onClose={jest.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Export video' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '720p HD' })).toBeChecked();
    expect(field('Width')).toHaveValue('1,280');
    expect(field('Height')).toHaveValue('720');
  });

  it('updates settings when preset chosen', () => {
    render(<ExportModal onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Encoding' }));

    fireEvent.click(screen.getByRole('radio', { name: '1080p Full HD' }));
    expect(field('Width')).toHaveValue('1,920');
    expect(field('Height')).toHaveValue('1,080');
    // Bitrate follows the preset: 8 Mbps
    expect(field('Video bitrate')).toHaveValue('8');
  });

  it('opens encoding and updates codec defaults with the container', () => {
    render(<ExportModal onClose={jest.fn()} />);
    expect(screen.queryByLabelText('Video codec')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Encoding' }));
    expect(screen.getByLabelText('Container format')).toHaveValue('mp4');
    expect(screen.getByLabelText('Video codec')).toHaveValue('avc');

    fireEvent.change(screen.getByLabelText('Container format'), { target: { value: 'webm' } });
    expect(screen.getByLabelText('Container format')).toHaveValue('webm');
    expect(screen.getByLabelText('Video codec')).toHaveValue('vp9');
    expect(screen.getByLabelText('Audio codec')).toHaveValue('opus');
  });

  it('handles input changes', () => {
    render(<ExportModal onClose={jest.fn()} />);

    const widthInput = field('Width');
    fireEvent.change(widthInput, { target: { value: '1000' } });
    fireEvent.blur(widthInput);
    expect(widthInput).toHaveValue('1,000');
    expect(screen.getByRole('radio', { name: 'Custom' })).toBeChecked();

    const fpsSelect = screen.getByLabelText('Frame rate');
    fireEvent.change(fpsSelect, { target: { value: '60' } });
    expect(fpsSelect).toHaveValue('60');
  });

  it('starts export and shows progress', async () => {
    render(<ExportModal onClose={jest.fn()} />);

    mockExportProject.mockImplementation((proj, settings, onProgress) => {
      setTimeout(() => {
        act(() => {
          onProgress({ status: 'rendering', percentage: 50, currentFrame: 10, totalFrames: 20 });
        });
      }, 10);
      return new Promise(() => {});
    });

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(screen.getByRole('dialog', { name: 'Exporting video' })).toBeInTheDocument();
    expect(screen.getByText('Starting the export engine.')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Rendering frame 10 of 20.')).toBeInTheDocument();
    });
    expect(screen.getByRole('progressbar', { name: 'Video export' })).toHaveAttribute('aria-valuenow', '10');
  });

  it('handles export completion', async () => {
    render(<ExportModal onClose={jest.fn()} />);

    mockExportProject.mockImplementation((proj, settings, onProgress) => {
      onProgress({ status: 'completed', percentage: 100, currentFrame: 20, totalFrames: 20 });
      return Promise.resolve(new Blob(['video'], { type: 'video/mp4' }));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => {
      expect(screen.getByText('Exported')).toBeInTheDocument();
    });
    expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThan(0);
  });

  it('handles cancellation from UI', async () => {
    const onClose = jest.fn();
    render(<ExportModal onClose={onClose} />);

    mockExportProject.mockImplementation(() => new Promise(() => {}));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockCancel).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
