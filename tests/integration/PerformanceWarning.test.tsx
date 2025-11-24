import React from 'react';
import { render, screen, act } from '@testing-library/react';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';

// Mock dependencies to avoid errors
jest.mock('../../src/services/AssetLoader');
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div>{children}</div>,
  TileLayer: () => <div>TileLayer</div>,
  Marker: () => <div>Marker</div>,
  Popup: () => <div>Popup</div>,
  useMap: () => ({ fitBounds: jest.fn() }),
}));
// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Performance Warning Integration', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        useProjectStore.setState({
            toasts: [],
            isPlaying: false,
            // Ensure duration is set
            settings: { duration: 100, width: 1920, height: 1080, fps: 30 }
        });
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('shows a warning toast when playback lags', async () => {
        render(<App />);

        // Mock performance.now before starting playback so start time is consistent
        const perfSpy = jest.spyOn(performance, 'now');
        let currentTime = 1000;
        perfSpy.mockReturnValue(currentTime);

        // Start playback
        act(() => {
            useProjectStore.setState({ isPlaying: true });
        });

        await act(async () => {
             for(let i=0; i<70; i++) {
                 currentTime += 100; // 100ms elapsed real time
                 perfSpy.mockReturnValue(currentTime);

                 // Advance timer by 20ms to trigger next rAF
                 jest.advanceTimersByTime(20);
             }
        });

        // Check store state directly first to confirm logic works
        const toasts = useProjectStore.getState().toasts;
        expect(toasts.length).toBeGreaterThan(0);
        expect(toasts[0].message).toMatch(/Low performance/i);

        // Check for toast in UI
        const toast = await screen.findByText(/Low performance detected/i);
        expect(toast).toBeInTheDocument();

        perfSpy.mockRestore();
    });
});
