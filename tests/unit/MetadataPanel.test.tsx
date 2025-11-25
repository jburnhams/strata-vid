import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MetadataPanel } from '../../src/components/MetadataPanel';
import { Asset } from '../../src/types';
import { useProjectStore } from '../../src/store/useProjectStore';

// Mock MapSyncControl to simplify test
jest.mock('../../src/components/MapSyncControl', () => ({
    MapSyncControl: () => <div data-testid="map-sync-control">Map Sync Control</div>
}));

describe('MetadataPanel', () => {
  const mockSettings = {
    width: 1920, height: 1080, fps: 30, duration: 0,
    previewQuality: 'high', snapToGrid: true, allowOverlaps: false,
    simplificationTolerance: 0.0001
  };
  const mockSetSettings = jest.fn();

  beforeEach(() => {
    useProjectStore.setState({
        selectedClipId: null,
        clips: {},
        selectedAssetId: null
    });
    mockSetSettings.mockClear();
  });

  it('renders empty state', () => {
    render(<MetadataPanel assets={[]} selectedAssetId={null} settings={mockSettings} setSettings={mockSetSettings} />);
    expect(screen.getByText('Select an asset to view details')).toBeInTheDocument();
  });

  it('renders asset details', () => {
    const asset: Asset = { id: '1', name: 'test.mp4', type: 'video', src: 'blob:x' };
    render(<MetadataPanel assets={[asset]} selectedAssetId="1" settings={mockSettings} setSettings={mockSetSettings} />);
    expect(screen.getByText('test.mp4')).toBeInTheDocument();
    expect(screen.getByText('video')).toBeInTheDocument();
  });

  it('renders GPX stats', () => {
    const asset: Asset = {
        id: '1', name: 'run.gpx', type: 'gpx', src: 'blob:z',
        stats: {
            distance: { total: 5000 },
            elevation: { gain: 100, loss: 100, max: 200, min: 100, average: 150 },
            time: { start: new Date(), end: new Date(), duration: 1800000 } // 30 mins
        }
    };

    render(<MetadataPanel assets={[asset]} selectedAssetId="1" settings={mockSettings} setSettings={mockSetSettings} />);

    expect(screen.getByText('GPX Statistics')).toBeInTheDocument();
    expect(screen.getByText('5.00 km')).toBeInTheDocument();
    expect(screen.getByText('100 m')).toBeInTheDocument();
    expect(screen.getByText('00:30:00')).toBeInTheDocument();
  });

  it('renders Clip Properties when a clip is selected', () => {
      const clip = {
          id: 'clip-1',
          assetId: 'asset-1',
          trackId: 'track-1',
          start: 0,
          duration: 10,
          offset: 0,
          type: 'video' as const,
          properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 }
      };

      useProjectStore.setState({
          selectedClipId: 'clip-1',
          clips: { 'clip-1': clip }
      });

      render(<MetadataPanel assets={[]} selectedAssetId={null} settings={mockSettings} setSettings={mockSetSettings} />);

      expect(screen.getByText('Clip Properties')).toBeInTheDocument();
      expect(screen.getByText('Opacity')).toBeInTheDocument();
      expect(screen.getByText('Rotation')).toBeInTheDocument();
  });

  it('renders Map Styling controls when a map clip is selected', () => {
      const clip = {
          id: 'clip-map',
          assetId: 'asset-map',
          trackId: 'track-1',
          start: 0,
          duration: 10,
          offset: 0,
          type: 'map' as const,
          properties: {
              x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0,
              mapZoom: 13,
              mapStyle: 'osm',
              trackStyle: { color: '#007acc', weight: 4 },
              markerStyle: { color: 'red' }
          }
      };

      useProjectStore.setState({
          selectedClipId: 'clip-map',
          clips: { 'clip-map': clip }
      });

      render(<MetadataPanel assets={[]} selectedAssetId={null} settings={mockSettings} setSettings={mockSetSettings} />);

      expect(screen.getByText('Map Styling')).toBeInTheDocument();
      expect(screen.getByTestId('map-sync-control')).toBeInTheDocument();

      // Test interactions
      const zoomInput = screen.getByLabelText(/Zoom Level/);
      fireEvent.change(zoomInput, { target: { value: '15' } });
      expect(useProjectStore.getState().clips['clip-map'].properties.mapZoom).toBe(15);

      const styleSelect = screen.getByLabelText(/Map Style/);
      fireEvent.change(styleSelect, { target: { value: 'mapbox' } });
      expect(useProjectStore.getState().clips['clip-map'].properties.mapStyle).toBe('mapbox');

      const colorInput = screen.getByLabelText(/Track Color/);
      fireEvent.change(colorInput, { target: { value: '#ff0000' } });
      expect(useProjectStore.getState().clips['clip-map'].properties.trackStyle?.color).toBe('#ff0000');

      const widthInput = screen.getByLabelText(/Track Width/);
      fireEvent.change(widthInput, { target: { value: '8' } });
      expect(useProjectStore.getState().clips['clip-map'].properties.trackStyle?.weight).toBe(8);

      const markerColorInput = screen.getByLabelText(/Marker Color/);
      fireEvent.change(markerColorInput, { target: { value: '#00ff00' } });
      expect(useProjectStore.getState().clips['clip-map'].properties.markerStyle?.color).toBe('#00ff00');
  });

  it('toggles the elevation profile checkbox', () => {
    const clip = {
        id: 'clip-map',
        assetId: 'asset-map',
        trackId: 'track-1',
        start: 0,
        duration: 10,
        offset: 0,
        type: 'map' as const,
        properties: {
            x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0,
            showElevationProfile: false,
        }
    };

    useProjectStore.setState({
        selectedClipId: 'clip-map',
        clips: { 'clip-map': clip }
    });

    const { rerender } = render(<MetadataPanel assets={[]} selectedAssetId={null} settings={mockSettings} setSettings={mockSetSettings} />);

    const checkbox = screen.getByTestId('show-elevation-checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    // This is a bit of a hacky way to test this, since the store update isn't synchronous.
    // In a real app, you'd want to use `waitFor` or something similar.
    rerender(<MetadataPanel assets={[]} selectedAssetId={null} settings={mockSettings} setSettings={mockSetSettings} />);

    expect(useProjectStore.getState().clips['clip-map'].properties.showElevationProfile).toBe(true);
  });

  it('renders KeyframeList for animatable properties of a selected clip', () => {
    const clip = {
      id: 'clip-1',
      assetId: 'asset-1',
      trackId: 'track-1',
      start: 0,
      duration: 10,
      offset: 0,
      type: 'video' as const,
      properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
      keyframes: {
        opacity: [
          { id: 'k1', time: 0, value: 0, easing: 'linear' },
        ],
      },
    };

    useProjectStore.setState({
      selectedClipId: 'clip-1',
      clips: { 'clip-1': clip },
    });

    render(<MetadataPanel assets={[]} selectedAssetId={null} settings={mockSettings} setSettings={mockSetSettings} />);

    // Check that the KeyframeList for Opacity is rendered and displays a keyframe
    const keyframeList = screen.getByTestId('keyframe-list-opacity');
    expect(keyframeList).toBeInTheDocument();

    // Check for an element that would be inside KeyframeList, like the value input
    const input = within(keyframeList).getByDisplayValue('0');
    expect(input).toBeInTheDocument();
  });

  describe('Extra Tracks UI', () => {
    const mapClip = {
        id: 'clip-map',
        assetId: 'gpx-1',
        trackId: 'track-1',
        start: 0, duration: 10, offset: 0,
        type: 'map' as const,
        properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
        extraTrackAssets: [{ assetId: 'gpx-2', trackStyle: { color: '#ff0000', weight: 3, opacity: 1 } }]
    };
    const gpxAssets: Asset[] = [
        { id: 'gpx-1', name: 'Primary.gpx', type: 'gpx', src: '' },
        { id: 'gpx-2', name: 'Secondary.gpx', type: 'gpx', src: '' },
        { id: 'gpx-3', name: 'Another.gpx', type: 'gpx', src: '' },
    ];

    beforeEach(() => {
        useProjectStore.setState({
            selectedClipId: 'clip-map',
            clips: { 'clip-map': mapClip },
            assets: gpxAssets.reduce((acc, a) => ({ ...acc, [a.id]: a }), {})
        });
    });

    it('renders the extra tracks section and lists existing tracks', () => {
        render(<MetadataPanel assets={gpxAssets} selectedAssetId={null} settings={mockSettings} setSettings={mockSetSettings} />);

        expect(screen.getByText('Extra Tracks')).toBeInTheDocument();
        expect(screen.getByText('Secondary.gpx')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
    });

    it('populates the asset dropdown correctly', () => {
        render(<MetadataPanel assets={gpxAssets} selectedAssetId={null} settings={mockSettings} setSettings={mockSetSettings} />);

        const select = screen.getByLabelText(/select a gpx asset/i);

        // Should contain gpx-3 ('Another.gpx')
        expect(within(select).getByText('Another.gpx')).toBeInTheDocument();

        // Should NOT contain gpx-1 (primary) or gpx-2 (already added)
        expect(within(select).queryByText('Primary.gpx')).not.toBeInTheDocument();
        expect(within(select).queryByText('Secondary.gpx')).not.toBeInTheDocument();
    });

    it('calls addExtraTrackToClip when Add button is clicked', () => {
        const addExtraTrackToClip = jest.fn();
        useProjectStore.setState({ addExtraTrackToClip });

        render(<MetadataPanel assets={gpxAssets} selectedAssetId={null} settings={mockSettings} setSettings={mockSetSettings} />);

        const select = screen.getByLabelText(/select a gpx asset/i);
        const addButton = screen.getByTestId('add-extra-track-button');

        fireEvent.change(select, { target: { value: 'gpx-3' } });
        fireEvent.click(addButton);

        expect(addExtraTrackToClip).toHaveBeenCalledWith('clip-map', 'gpx-3');
    });

    it('calls removeExtraTrackFromClip when Remove button is clicked', () => {
        const removeExtraTrackFromClip = jest.fn();
        useProjectStore.setState({ removeExtraTrackFromClip });

        render(<MetadataPanel assets={gpxAssets} selectedAssetId={null} settings={mockSettings} setSettings={mockSetSettings} />);

        const removeButton = screen.getByRole('button', { name: /Remove/i });
        fireEvent.click(removeButton);

        expect(removeExtraTrackFromClip).toHaveBeenCalledWith('clip-map', 'gpx-2');
    });

    it('calls updateExtraTrackOnClip when track style is changed', () => {
        const updateExtraTrackOnClip = jest.fn();
        useProjectStore.setState({ updateExtraTrackOnClip });

        render(<MetadataPanel assets={gpxAssets} selectedAssetId={null} settings={mockSettings} setSettings={mockSetSettings} />);

        const colorInput = screen.getByLabelText('Color');
        fireEvent.change(colorInput, { target: { value: '#00ff00' } });

        expect(updateExtraTrackOnClip).toHaveBeenCalledWith('clip-map', 'gpx-2', {
            trackStyle: { color: '#00ff00', weight: 3, opacity: 1 }
        });
    });
  });
});
