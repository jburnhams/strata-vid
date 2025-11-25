
import React from 'react';
import { render, fireEvent, act, screen, waitFor, within } from '@testing-library/react';
import App from '../../src/App';
import { useProjectStore } from '../../src/store/useProjectStore';
import '@testing-library/jest-dom';

// JSDOM's File implementation is incomplete. Mock the .text() method.
if (!File.prototype.text) {
  File.prototype.text = function() {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target.result as string);
      };
      reader.readAsText(this);
    });
  };
}

// Mock Leaflet and other globals via setup file

describe('GPX Simplification Integration', () => {
    beforeEach(() => {
        // Reset store to a clean state
        act(() => {
            const initialState = useProjectStore.getState();
            useProjectStore.setState({ ...initialState, assets: {}, selectedAssetId: null });
        });
    });

    it('allows user to load a GPX, change tolerance, and re-process it', async () => {
        const { getByLabelText, getByText, findByText } = render(<App />);

        // 1. Load a GPX file
        const gpxContent = `
            <gpx>
                <trk><trkseg>
                    ${Array.from({ length: 50 }).map((_, i) => `<trkpt lat="${i*0.0001}" lon="${i*0.0001}"><time>2023-01-01T00:00:${i.toString().padStart(2, '0')}Z</time></trkpt>`).join('')}
                </trkseg></trk>
            </gpx>
        `;
        const gpxFile = new File([gpxContent], 'route.gpx', { type: 'application/gpx+xml' });

        const fileInput = screen.getByTestId('add-asset-input');
        await act(async () => {
            fireEvent.change(fileInput, { target: { files: [gpxFile] } });
        });

        // Wait for asset to appear in the library and get selected
        const libraryPanel = screen.getByTestId('library-panel');
        const assetItem = await within(libraryPanel).findByText('route.gpx');
        act(() => {
            fireEvent.click(assetItem);
        });

        // Get the generated asset ID
        const assetId = Object.values(useProjectStore.getState().assets)[0].id;

        // At this point, the asset should be loaded with the default tolerance.
        // The actual simplification is hard to assert without complex mocks, so we trust the unit test.
        // We'll focus on the re-processing flow.

        let originalPointsCount = useProjectStore.getState().assets[assetId].gpxPoints?.length || 0;
        // With default tolerance of 0.0001 it should simplify the linear track to 2 points
        expect(originalPointsCount).toBe(2);

        // 2. Change the simplification tolerance in MetadataPanel
        const toleranceSlider = getByLabelText(/Simplification Tolerance/);
        act(() => {
            fireEvent.change(toleranceSlider, { target: { value: '0' } }); // No simplification
        });

        // 3. Click the re-process button
        const reprocessButton = getByText(/Re-process GPX/i);
        await act(async () => {
            fireEvent.click(reprocessButton);
        });

        // 4. Assert that the number of points in the asset has changed
        await waitFor(() => {
            const newPointsCount = useProjectStore.getState().assets[assetId].gpxPoints?.length || 0;
            // With tolerance 0, no simplification should occur, so we get all 50 points.
            expect(newPointsCount).toBe(50);
        });
    });
});
