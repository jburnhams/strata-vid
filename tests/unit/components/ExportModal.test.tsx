import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ExportModal } from '../../../src/components/ExportModal';
import { ExportManager } from '../../../src/services/ExportManager';

// Mock ExportManager
jest.mock('../../../src/services/ExportManager');
const MockExportManager = ExportManager as jest.MockedClass<typeof ExportManager>;

describe('ExportModal', () => {
  let mockExportProject: jest.Mock;
  let mockCancel: jest.Mock;

  beforeEach(() => {
    mockExportProject = jest.fn();
    mockCancel = jest.fn();

    MockExportManager.mockImplementation(() => ({
      exportProject: mockExportProject,
      cancel: mockCancel,
    } as any));

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows settings initially', async () => {
    render(<ExportModal onClose={jest.fn()} />);
    expect(screen.getByText('Export Settings')).toBeInTheDocument();
    expect(screen.getByText('Start Export')).toBeInTheDocument();
  });

  test('starts export when button clicked', async () => {
    mockExportProject.mockReturnValue(new Promise(() => {})); // Pending promise
    render(<ExportModal onClose={jest.fn()} />);

    await act(async () => {
        fireEvent.click(screen.getByText('Start Export'));
    });

    // Wait for effect
    await waitFor(() => {
      expect(mockExportProject).toHaveBeenCalled();
    });
  });

  test('shows progress updates', async () => {
    mockExportProject.mockImplementation((data, settings, onProgress) => {
      // Simulate progress updates
      onProgress({ status: 'encoding', percentage: 50, currentFrame: 50, totalFrames: 100 });
      return new Promise(() => {});
    });

    render(<ExportModal onClose={jest.fn()} />);
    fireEvent.click(screen.getByText('Start Export'));

    await waitFor(() => {
        expect(screen.getByText('Encoding...')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  test('shows completion state and download link', async () => {
    mockExportProject.mockImplementation(async (data, settings, onProgress) => {
      onProgress({ status: 'completed', percentage: 100 });
      return new Blob(['test']);
    });

    render(<ExportModal onClose={jest.fn()} />);
    fireEvent.click(screen.getByText('Start Export'));

    await waitFor(() => {
        expect(screen.getByText('Export Complete!')).toBeInTheDocument();
        expect(screen.getByText('Done')).toBeInTheDocument();
        expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  test('cancels export when cancel button clicked during progress', async () => {
    mockExportProject.mockReturnValue(new Promise(() => {}));
    const onClose = jest.fn();
    render(<ExportModal onClose={onClose} />);

    fireEvent.click(screen.getByText('Start Export'));

    // Wait for render
    await waitFor(() => expect(screen.getByText(/Initializing export engine/i)).toBeInTheDocument());

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockCancel).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test('displays error state', async () => {
     mockExportProject.mockImplementation(async (data, settings, onProgress) => {
      onProgress({ status: 'error', percentage: 0, error: 'Something exploded' });
      return null;
    });

    render(<ExportModal onClose={jest.fn()} />);
    fireEvent.click(screen.getByText('Start Export'));

    await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByText(/Something exploded/)).toBeInTheDocument();
    });
  });
});
