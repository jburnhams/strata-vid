
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { MetadataPanel } from '../../../src/components/MetadataPanel';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { Asset, Clip, ProjectSettings } from '../../../src/types';

// Mock the zustand store
jest.mock('../../../src/store/useProjectStore');

const mockUpdateClipProperties = jest.fn();
const mockAddExtraTrackToClip = jest.fn();
const mockRemoveExtraTrackFromClip = jest.fn();
const mockUpdateExtraTrackOnClip = jest.fn();
const mockReprocessGpxAsset = jest.fn();

const mockAssets: Asset[] = [
    { id: 'asset1', name: 'Video Asset', type: 'video', source: 'video.mp4', duration: 10, resolution: { width: 1920, height: 1080 } },
    { id: 'asset2', name: 'GPX Asset', type: 'gpx', source: 'track.gpx', stats: { distance: { total: 5000 }, elevation: { gain: 300 }, time: { duration: 3600000 } } },
    { id: 'asset3', name: 'Extra GPX', type: 'gpx', source: 'extra.gpx' },
];

const mockMapClip: Clip = {
    id: 'clip1',
    assetId: 'asset2',
    trackId: 'track1',
    start: 0,
    end: 10,
    type: 'map',
    properties: { mapZoom: 13, showElevationProfile: true, trackStyle: { color: '#ff0000', weight: 3 }, heatmap: { enabled: false } },
    extraTrackAssets: [],
};

const mockDataClip: Clip = {
    id: 'clip2',
    assetId: 'asset2',
    trackId: 'track1',
    start: 0,
    end: 10,
    type: 'data',
    properties: { dataOverlay: { showSpeed: true, showDistance: false } },
    textStyle: { fontSize: 18 },
};

const mockVideoClip: Clip = {
    id: 'clip3',
    assetId: 'asset1',
    trackId: 'track1',
    start: 0,
    end: 10,
    type: 'video',
    properties: { opacity: 0.8, rotation: 45, x: 50, y: 50 },
};


const mockSettings: ProjectSettings = {
    width: 1920, height: 1080, fps: 30, duration: 60,
    previewQuality: 'high', snapToGrid: true, allowOverlaps: false,
    simplificationTolerance: 0.0001,
};
const mockSetSettings = jest.fn();

describe('MetadataPanel', () => {
    beforeEach(() => {
        (useProjectStore as unknown as jest.Mock).mockReturnValue({
            reprocessGpxAsset: mockReprocessGpxAsset,
            selectedClipId: null,
            clips: { [mockMapClip.id]: mockMapClip, [mockDataClip.id]: mockDataClip, [mockVideoClip.id]: mockVideoClip },
            updateClipProperties: mockUpdateClipProperties,
            addExtraTrackToClip: mockAddExtraTrackToClip,
            removeExtraTrackFromClip: mockRemoveExtraTrackFromClip,
            updateExtraTrackOnClip: mockUpdateExtraTrackOnClip,
        });
        jest.clearAllMocks();
    });

    it('should render "no asset selected" message', () => {
        render(<MetadataPanel assets={mockAssets} selectedAssetId={null} settings={mockSettings} setSettings={mockSetSettings} />);
        expect(screen.getByText('Select an asset to view details')).toBeInTheDocument();
    });

    it('should render asset metadata when an asset is selected', () => {
        render(<MetadataPanel assets={mockAssets} selectedAssetId="asset1" settings={mockSettings} setSettings={mockSetSettings} />);
        expect(screen.getByText('Video Asset')).toBeInTheDocument();
        expect(screen.getByText('1920x1080')).toBeInTheDocument();
    });

    it('should render GPX asset metadata and reprocess button', () => {
        render(<MetadataPanel assets={mockAssets} selectedAssetId="asset2" settings={mockSettings} setSettings={mockSetSettings} />);
        expect(screen.getByText('5.00 km')).toBeInTheDocument();
        const reprocessButton = screen.getByText('Re-process GPX');
        fireEvent.click(reprocessButton);
        expect(mockReprocessGpxAsset).toHaveBeenCalledWith('asset2', 0.0001);
    });

    it('should render clip properties when a map clip is selected', () => {
        (useProjectStore as unknown as jest.Mock).mockReturnValue({ ...useProjectStore(), selectedClipId: 'clip1' });
        render(<MetadataPanel assets={mockAssets} selectedAssetId="asset2" settings={mockSettings} setSettings={mockSetSettings} />);

        expect(screen.getByText('Clip Properties')).toBeInTheDocument();
        expect(screen.getByLabelText('Zoom Level (13)')).toBeInTheDocument();

        const zoomInput = screen.getByLabelText('Zoom Level (13)');
        fireEvent.change(zoomInput, { target: { value: 15 } });
        expect(mockUpdateClipProperties).toHaveBeenCalledWith('clip1', { mapZoom: 15 });
    });

    it('should allow removing extra tracks for a map clip', () => {
        (useProjectStore as unknown as jest.Mock).mockReturnValue({
            ...useProjectStore(),
            selectedClipId: 'clip1',
            clips: { ...useProjectStore().clips, [mockMapClip.id]: { ...mockMapClip, extraTrackAssets: [{ assetId: 'asset3', trackStyle: { color: '#00ff00' } }] } },
        });

        render(<MetadataPanel assets={mockAssets} selectedAssetId="asset2" settings={mockSettings} setSettings={mockSetSettings} />);

        // Test remove
        const removeButton = screen.getByText('Remove');
        fireEvent.click(removeButton);
        expect(mockRemoveExtraTrackFromClip).toHaveBeenCalledWith('clip1', 'asset3');
    });

    it('should render data clip properties', () => {
        (useProjectStore as unknown as jest.Mock).mockReturnValue({ ...useProjectStore(), selectedClipId: 'clip2' });
        render(<MetadataPanel assets={mockAssets} selectedAssetId="asset2" settings={mockSettings} setSettings={mockSetSettings} />);

        const speedCheckbox = screen.getByLabelText('Show Speed');
        expect(speedCheckbox).toBeChecked();
        fireEvent.click(speedCheckbox);
        expect(mockUpdateClipProperties).toHaveBeenCalledWith('clip2', { dataOverlay: { showSpeed: false, showDistance: false } });

        const fontSizeInput = screen.getByLabelText('Font Size');
        fireEvent.change(fontSizeInput, { target: { value: '24' } });
        expect(mockUpdateClipProperties).toHaveBeenCalledWith('clip2', { textStyle: { fontSize: 24 } });
    });

    it('should render video clip properties', () => {
        (useProjectStore as unknown as jest.Mock).mockReturnValue({ ...useProjectStore(), selectedClipId: 'clip3' });
        render(<MetadataPanel assets={mockAssets} selectedAssetId="asset1" settings={mockSettings} setSettings={mockSetSettings} />);

        const opacitySlider = screen.getByLabelText('Opacity');
        fireEvent.change(opacitySlider, { target: { value: '0.5' } });
        expect(mockUpdateClipProperties).toHaveBeenCalledWith('clip3', { opacity: 0.5 });
    });

    it('should handle heatmap controls for a map clip', () => {
        // Set up the store with the map clip selected
        (useProjectStore as unknown as jest.Mock).mockReturnValue({ ...useProjectStore(), selectedClipId: 'clip1' });
        render(<MetadataPanel assets={mockAssets} selectedAssetId="asset2" settings={mockSettings} setSettings={mockSetSettings} />);

        // 1. Check and click the "Enable Heatmap" checkbox
        const heatmapCheckbox = screen.getByLabelText('Enable Heatmap');
        expect(heatmapCheckbox).not.toBeChecked();
        fireEvent.click(heatmapCheckbox);
        expect(mockUpdateClipProperties).toHaveBeenCalledWith('clip1', { heatmap: { enabled: true } });

        // 2. Re-render with the heatmap enabled to show the data source dropdown
        (useProjectStore as unknown as jest.Mock).mockReturnValue({
            ...useProjectStore(),
            selectedClipId: 'clip1',
            clips: { [mockMapClip.id]: { ...mockMapClip, properties: { ...mockMapClip.properties, heatmap: { enabled: true, dataSource: 'speed' } } } },
        });
        render(<MetadataPanel assets={mockAssets} selectedAssetId="asset2" settings={mockSettings} setSettings={mockSetSettings} />);

        // 3. Find and change the "Data Source" select
        const dataSourceSelect = screen.getByLabelText('Data Source');
        fireEvent.change(dataSourceSelect, { target: { value: 'elevation' } });
        expect(mockUpdateClipProperties).toHaveBeenCalledWith('clip1', { heatmap: { enabled: true, dataSource: 'elevation' } });
    });
});
