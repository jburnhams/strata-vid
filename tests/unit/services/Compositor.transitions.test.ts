
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Compositor } from '../../../src/services/Compositor';
import { Clip, Asset, ProjectSettings, Track } from '../../../src/types';

describe('Compositor - Transitions', () => {
  let compositor: Compositor;
  let mockCtx: any;

  beforeEach(() => {
    compositor = new Compositor();
    mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      beginPath: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      drawImage: jest.fn(),
      measureText: jest.fn(() => ({ width: 10 })),
      fillText: jest.fn(),
      canvas: { width: 1920, height: 1080 },
    };
  });

  it('should apply opacity for crossfade transition', async () => {
    const clip: Clip = {
      id: 'c1',
      assetId: 'a1',
      trackId: 't1',
      start: 10,
      duration: 10,
      offset: 0,
      type: 'image',
      properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
      transitionIn: { type: 'crossfade', duration: 2 }
    };

    const asset: Asset = { id: 'a1', type: 'image', src: 'test.png', name: 'Test' };

    const project = {
      tracks: [{ id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: ['c1'] } as Track],
      clips: { 'c1': clip },
      assets: { 'a1': asset },
      settings: { width: 1920, height: 1080 } as ProjectSettings
    };

    // Render at start + 1s (50% progress)
    // 10 + 1 = 11
    await compositor.renderFrame(mockCtx, 11, project);

    expect(mockCtx.globalAlpha).toBe(0.5);
  });

  it('should clip rect for wipe transition', async () => {
    const clip: Clip = {
      id: 'c1',
      assetId: 'a1',
      trackId: 't1',
      start: 10,
      duration: 10,
      offset: 0,
      type: 'image',
      properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
      transitionIn: { type: 'wipe', duration: 2 }
    };

    const asset: Asset = { id: 'a1', type: 'image', src: 'test.png', name: 'Test' };

    const project = {
      tracks: [{ id: 't1', type: 'video', label: 'V1', isMuted: false, isLocked: false, clips: ['c1'] } as Track],
      clips: { 'c1': clip },
      assets: { 'a1': asset },
      settings: { width: 1920, height: 1080 } as ProjectSettings
    };

    // Render at start + 1s (50% progress)
    await compositor.renderFrame(mockCtx, 11, project);

    // Width is 100% of 1920 = 1920. Height = 1080.
    // 50% wipe = 960 width.
    // Rect is drawn centered at (0,0) after translate.
    // -w/2 = -960. -h/2 = -540.
    // Visible width = 960.

    expect(mockCtx.rect).toHaveBeenCalledWith(-960, -540, 960, 1080);
  });
});
