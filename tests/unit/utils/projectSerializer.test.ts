import { serializeProject, deserializeProject, SerializedProject } from '../../../src/utils/projectSerializer';
import { StoreState } from '../../../src/store/types';
import { Asset, ProjectSettings, Track, Clip } from '../../../src/types';

describe('projectSerializer', () => {
  const mockSettings: ProjectSettings = {
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 60,
    previewQuality: 'high',
    snapToGrid: true,
    allowOverlaps: false,
  };

  const mockAsset: Asset = {
    id: 'asset-1',
    name: 'video.mp4',
    type: 'video',
    src: 'blob:http://localhost/12345',
    file: new File([''], 'video.mp4', { type: 'video/mp4' }),
    duration: 10,
    resolution: { width: 1920, height: 1080 },
  };

  const mockTrack: Track = {
    id: 'track-1',
    type: 'video',
    label: 'Video Track',
    isMuted: false,
    isLocked: false,
    clips: ['clip-1'],
  };

  const mockClip: Clip = {
    id: 'clip-1',
    assetId: 'asset-1',
    trackId: 'track-1',
    start: 0,
    duration: 5,
    offset: 0,
    type: 'video',
    properties: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
    },
  };

  const mockStoreState: StoreState = {
    id: 'project-1',
    settings: mockSettings,
    assets: { 'asset-1': mockAsset },
    selectedAssetId: null,
    tracks: { 'track-1': mockTrack },
    clips: { 'clip-1': mockClip },
    trackOrder: ['track-1'],
    currentTime: 10, // Should be ignored/reset
    isPlaying: true, // Should be ignored/reset
    playbackRate: 1, // Should be ignored/reset

    // Mock functions
    setSettings: jest.fn(),
    addAsset: jest.fn(),
    removeAsset: jest.fn(),
    selectAsset: jest.fn(),
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
    addClip: jest.fn(),
    removeClip: jest.fn(),
    moveClip: jest.fn(),
    resizeClip: jest.fn(),
    duplicateClip: jest.fn(),
    updateClipSyncOffset: jest.fn(),
    setPlaybackState: jest.fn(),
    loadProject: jest.fn(),
    updateClipProperties: jest.fn(),
    selectClip: jest.fn(),
    setLoading: jest.fn(),
    addToast: jest.fn(),
    removeToast: jest.fn(),
    toasts: [],
    isLoading: false,
    loadingMessage: null,
  };

  describe('serializeProject', () => {
    it('should return a valid JSON string', () => {
      const json = serializeProject(mockStoreState);
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should strip file objects and blob URLs', () => {
      const json = serializeProject(mockStoreState);
      const parsed: SerializedProject = JSON.parse(json);

      expect(parsed.assets['asset-1'].src).toBeNull();
      expect((parsed.assets['asset-1'] as any).file).toBeUndefined();
      expect(parsed.assets['asset-1'].fileName).toBe('video.mp4');
    });

    it('should preserve project settings and structure', () => {
      const json = serializeProject(mockStoreState);
      const parsed: SerializedProject = JSON.parse(json);

      expect(parsed.project.id).toBe('project-1');
      expect(parsed.project.settings).toEqual(mockSettings);
      expect(parsed.timeline.tracks).toEqual({ 'track-1': mockTrack });
      expect(parsed.timeline.clips).toEqual({ 'clip-1': mockClip });
      expect(parsed.timeline.trackOrder).toEqual(['track-1']);
    });
  });

  describe('deserializeProject', () => {
    it('should correctly reconstruct the state', () => {
      const json = serializeProject(mockStoreState);
      const deserialized = deserializeProject(json);

      expect(deserialized).not.toBeNull();
      if (!deserialized) return;

      expect(deserialized.id).toBe('project-1');
      expect(deserialized.settings).toEqual(mockSettings);

      // Assets should have empty src and no file
      const restoredAsset = deserialized.assets['asset-1'];
      expect(restoredAsset.src).toBe('');
      expect(restoredAsset.file).toBeUndefined();
      expect(restoredAsset.name).toBe('video.mp4');
      expect(restoredAsset.duration).toBe(10);

      expect(deserialized.tracks).toEqual({ 'track-1': mockTrack });
      expect(deserialized.clips).toEqual({ 'clip-1': mockClip });
      expect(deserialized.trackOrder).toEqual(['track-1']);
    });

    it('should return null for invalid JSON', () => {
      const result = deserializeProject('invalid-json');
      expect(result).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const invalidProject = {
        version: 1,
        // Missing project, timeline
      };
      const result = deserializeProject(JSON.stringify(invalidProject));
      expect(result).toBeNull();
    });
  });
});
