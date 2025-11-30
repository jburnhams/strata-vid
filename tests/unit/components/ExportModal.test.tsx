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

  it('renders correctly with default settings', () => {
    render(<ExportModal onClose={jest.fn()} />);
    expect(screen.getByText('Export Settings')).toBeInTheDocument();
    expect(screen.getByText('720p HD')).toBeInTheDocument();
    expect(screen.getByLabelText('Width')).toHaveValue(1280);
    expect(screen.getByLabelText('Height')).toHaveValue(720);
  });

  it('updates settings when preset clicked', () => {
    render(<ExportModal onClose={jest.fn()} />);

    // Toggle Advanced to see Bitrate field
    fireEvent.click(screen.getByText('Advanced Settings'));

    fireEvent.click(screen.getByText('1080p Full HD'));
    expect(screen.getByLabelText('Width')).toHaveValue(1920);
    expect(screen.getByLabelText('Height')).toHaveValue(1080);
    // Bitrate should update to 8Mbps
    expect(screen.getByLabelText('Bitrate (Mbps)')).toHaveValue(8);
  });

  it('toggles advanced settings and updates codec defaults', () => {
    render(<ExportModal onClose={jest.fn()} />);
    expect(screen.queryByText('Video Encoding')).not.toBeInTheDocument();

    // Toggle Advanced
    fireEvent.click(screen.getByText('Advanced Settings'));
    expect(screen.getByText('Video Encoding')).toBeInTheDocument();

    // Check Defaults (MP4 -> AVC)
    expect(screen.getByLabelText('Container Format')).toHaveValue('mp4');
    expect(screen.getByLabelText('Codec', { selector: '#export-video-codec' })).toHaveValue('avc');

    // Change to WebM
    fireEvent.change(screen.getByLabelText('Container Format'), { target: { value: 'webm' } });

    // Verify updates
    expect(screen.getByLabelText('Container Format')).toHaveValue('webm');
    expect(screen.getByLabelText('Codec', { selector: '#export-video-codec' })).toHaveValue('vp9');
    expect(screen.getByLabelText('Codec', { selector: '#export-audio-codec' })).toHaveValue('opus');
  });

  it('handles input changes', () => {
      render(<ExportModal onClose={jest.fn()} />);

      const widthInput = screen.getByLabelText('Width');
      fireEvent.change(widthInput, { target: { value: '100' } });
      expect(widthInput).toHaveValue(100);

      const fpsSelect = screen.getByLabelText('FPS');
      fireEvent.change(fpsSelect, { target: { value: '60' } });
      expect(fpsSelect).toHaveValue('60');
  });

  it('starts export and shows progress', async () => {
     render(<ExportModal onClose={jest.fn()} />);

     // Mock progress callback behavior
     mockExportProject.mockImplementation((proj, settings, onProgress) => {
         // Simulate async progress
         setTimeout(() => {
             act(() => {
                 onProgress({ status: 'rendering', percentage: 50, currentFrame: 10, totalFrames: 20 });
             });
         }, 10);
         return Promise.resolve(new Blob(['video'], { type: 'video/mp4' }));
     });

     fireEvent.click(screen.getByText('Start Export'));

     expect(screen.getByText('Exporting Project')).toBeInTheDocument();
     expect(screen.getByText('Initializing export engine...')).toBeInTheDocument();

     await waitFor(() => {
         expect(screen.getByText('Rendering...')).toBeInTheDocument();
     });

     expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('handles export completion', async () => {
      render(<ExportModal onClose={jest.fn()} />);

      mockExportProject.mockImplementation((proj, settings, onProgress) => {
          onProgress({ status: 'completed', percentage: 100, currentFrame: 20, totalFrames: 20 });
          return Promise.resolve(new Blob(['video'], { type: 'video/mp4' }));
      });

      fireEvent.click(screen.getByText('Start Export'));

      await waitFor(() => {
          expect(screen.getByText('Export Complete!')).toBeInTheDocument();
      });

      expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('handles cancellation from UI', async () => {
      const onClose = jest.fn();
      render(<ExportModal onClose={onClose} />);

      // Enter progress state
      mockExportProject.mockImplementation(() => new Promise(() => {})); // pending promise
      fireEvent.click(screen.getByText('Start Export'));

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockCancel).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
  });
});
