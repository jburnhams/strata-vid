import { describe, it, expect } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';
import App from '@/src/App';

// Mock URL.createObjectURL for integration tests too
global.URL.createObjectURL = jest.fn(() => 'mock-url');

describe('Browser Integration Tests', () => {
  describe('index.html structure', () => {
    let htmlContent: string;

    beforeEach(() => {
      htmlContent = fs.readFileSync(
        path.join(__dirname, '..', '..', 'index.html'),
        'utf-8'
      );
    });

    it('has valid HTML structure with doctype', () => {
      expect(htmlContent).toMatch(/^<!doctype html>/i);
    });

    it('has correct title', () => {
      expect(htmlContent).toContain('<title>Strata Vid</title>');
    });

    it('has root div with correct id', () => {
      expect(htmlContent).toMatch(/<div\s+id="root"[^>]*>/i);
    });

    it('has main script tag pointing to correct entry point', () => {
        expect(htmlContent).toMatch(/<script\s+type="module"\s+src="\/src\/main\.tsx"[^>]*>/i);
    });
  });

  describe('App component integration', () => {
    it('renders the app with all required panels', () => {
      render(<App />);

      // Check main heading
      expect(screen.getByText('Strata Vid')).toBeInTheDocument();

      // Check panels
      expect(screen.getByText('Library')).toBeInTheDocument();
      expect(screen.getByText('Asset Metadata')).toBeInTheDocument();
      // Timeline panel no longer has a static "Timeline" header, checks for Zoom control
      expect(screen.getByText(/Zoom:/)).toBeInTheDocument();
    });

    it('allows adding a video file to the library', async () => {
      render(<App />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['dummy content'], 'run_video.mp4', { type: 'video/mp4' });

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      // Verify it appears in the library (using getAllByText because it might be in Metadata too)
      await waitFor(() => {
        const items = screen.getAllByText('run_video.mp4');
        expect(items.length).toBeGreaterThan(0);
      });

      // Verify preview is active (video element present)
      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', 'mock-url');
    });
  });
});
