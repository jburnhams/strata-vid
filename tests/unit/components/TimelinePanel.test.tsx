import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { installLayoutShims } from 'strata-react/testing';
import { TimelinePanel } from '../../../src/components/TimelinePanel';
import { useProjectStore } from '../../../src/store/useProjectStore';
import type { Clip, Track } from '../../../src/types';

const props = { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 };
const clip = (id: string, trackId: string, start: number, duration: number, offset = 0): Clip =>
  ({ id, assetId: id, trackId, start, duration, offset, type: 'video', properties: props, volume: 1 });
const track = (id: string, label: string, clips: string[], extra: Partial<Track> = {}): Track =>
  ({ id, type: 'video', label, isMuted: false, isLocked: false, volume: 1, clips, ...extra });

describe('TimelinePanel', () => {
  let restore: () => void;
  beforeAll(() => { restore = installLayoutShims({ width: 1200, height: 300 }); });
  afterAll(() => restore());

  beforeEach(() => {
    useProjectStore.setState({
      tracks: { t1: track('t1', 'Footage', ['a', 'b']), t2: track('t2', 'Overlays', []) },
      clips: { a: clip('a', 't1', 0, 10, 2), b: clip('b', 't1', 20, 5) },
      assets: {
        a: { id: 'a', name: 'run.mp4', type: 'video', src: '' },
        b: { id: 'b', name: 'finish.mp4', type: 'video', src: '' },
      },
      trackOrder: ['t1', 't2'],
      markers: [],
      currentTime: 0,
      isPlaying: false,
      selectedClipId: null,
      zoomLevel: 10,
      settings: { ...useProjectStore.getState().settings, fps: 10, snapToGrid: false, allowOverlaps: false },
    });
  });

  const item = (name: RegExp) => screen.getByRole('button', { name });

  it('draws each track as a lane and each clip as a named item', () => {
    render(<TimelinePanel />);
    expect(screen.getByRole('group', { name: 'Footage' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Overlays' })).toBeInTheDocument();
    expect(item(/^run\.mp4, 0:00 to 0:10, Footage$/)).toBeInTheDocument();
  });

  it('moves a clip by keyboard, one frame a step', () => {
    render(<TimelinePanel />);
    fireEvent.keyDown(item(/^run\.mp4/), { key: 'ArrowRight', ctrlKey: true });
    expect(useProjectStore.getState().clips.a.start).toBeCloseTo(0.1);
  });

  it('moves a clip to the next track', () => {
    render(<TimelinePanel />);
    fireEvent.keyDown(item(/^finish\.mp4/), { key: 'ArrowDown', ctrlKey: true });
    const s = useProjectStore.getState();
    expect(s.clips.b.trackId).toBe('t2');
    expect(s.tracks.t2.clips).toContain('b');
  });

  it('trims the start and moves the in-point with it', () => {
    render(<TimelinePanel />);
    fireEvent.keyDown(item(/^run\.mp4/), { key: 'ArrowRight', altKey: true, shiftKey: true });
    const a = useProjectStore.getState().clips.a;
    expect(a.start).toBeCloseTo(0.1);
    expect(a.duration).toBeCloseTo(9.9);
    expect(a.offset).toBeCloseTo(2.1);
  });

  it('trims the end without moving the in-point', () => {
    render(<TimelinePanel />);
    fireEvent.keyDown(item(/^run\.mp4/), { key: 'ArrowLeft', altKey: true });
    const a = useProjectStore.getState().clips.a;
    expect(a.duration).toBeCloseTo(9.9);
    expect(a.offset).toBe(2);
  });

  it('refuses to extend a video clip back past the first frame of its file', () => {
    render(<TimelinePanel />);
    fireEvent.keyDown(item(/^finish\.mp4/), { key: 'ArrowLeft', altKey: true, shiftKey: true });
    const b = useProjectStore.getState().clips.b;
    expect(b.start).toBe(20);
    expect(b.duration).toBe(5);
  });

  it('extends a map clip back from its start, since a map has no first frame', () => {
    useProjectStore.setState({
      clips: { a: clip('a', 't1', 0, 10, 2), b: { ...clip('b', 't1', 20, 5), type: 'map' } },
      assets: {
        a: { id: 'a', name: 'run.mp4', type: 'video', src: '' },
        b: { id: 'b', name: 'route.gpx', type: 'gpx', src: '' },
      },
    });
    render(<TimelinePanel />);
    fireEvent.keyDown(item(/^route\.gpx/), { key: 'ArrowLeft', altKey: true, shiftKey: true });
    const b = useProjectStore.getState().clips.b;
    expect(b.start).toBeCloseTo(19.9);
    expect(b.duration).toBeCloseTo(5.1);
    expect(b.offset).toBe(0);
  });

  it('refuses a move onto another clip unless overlaps are allowed', () => {
    useProjectStore.setState({ clips: { a: clip('a', 't1', 0, 10), b: clip('b', 't1', 10, 5) } });
    render(<TimelinePanel />);
    fireEvent.keyDown(item(/^run\.mp4/), { key: 'ArrowRight', ctrlKey: true });
    expect(useProjectStore.getState().clips.a.start).toBe(0);
  });

  it('refuses to change a locked track', () => {
    useProjectStore.setState({ tracks: { ...useProjectStore.getState().tracks, t1: track('t1', 'Footage', ['a', 'b'], { isLocked: true }) } });
    render(<TimelinePanel />);
    fireEvent.keyDown(item(/^run\.mp4/), { key: 'ArrowRight', ctrlKey: true });
    expect(useProjectStore.getState().clips.a.start).toBe(0);
  });

  it('selects a clip and removes it with Delete', () => {
    render(<TimelinePanel />);
    fireEvent.keyDown(item(/^run\.mp4/), { key: 'Enter' });
    expect(useProjectStore.getState().selectedClipId).toBe('a');
    fireEvent.keyDown(item(/^run\.mp4/), { key: 'Delete' });
    expect(useProjectStore.getState().clips.a).toBeUndefined();
  });

  it('adds a track and a marker from its toolbar', () => {
    useProjectStore.setState({ currentTime: 4 });
    render(<TimelinePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Add track' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add marker' }));
    const s = useProjectStore.getState();
    expect(s.trackOrder).toHaveLength(3);
    expect(s.tracks[s.trackOrder[2]].label).toBe('Track 3');
    expect(s.markers[0].time).toBe(4);
  });

  it('turns snapping and overlaps on and off', () => {
    render(<TimelinePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Allow overlaps' }));
    expect(useProjectStore.getState().settings.allowOverlaps).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Snap' }));
    expect(useProjectStore.getState().settings.snapToGrid).toBe(true);
  });

  it('zooms in and out', () => {
    render(<TimelinePanel />);
    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(useProjectStore.getState().zoomLevel).toBeCloseTo(12.5);
    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }));
    expect(useProjectStore.getState().zoomLevel).toBeCloseTo(10);
  });

  it('offers an empty timeline a way to start', () => {
    useProjectStore.setState({ tracks: {}, clips: {}, trackOrder: [] });
    render(<TimelinePanel />);
    expect(screen.getByText('No tracks yet')).toBeInTheDocument();
  });

  it('opens a clip menu that says why an action cannot run', async () => {
    render(<TimelinePanel />);
    fireEvent.contextMenu(screen.getByTestId('clip-item-a'));
    const menu = await screen.findByRole('menu', { name: 'Clip run.mp4' });
    expect(within(menu).getByRole('menuitem', { name: /Split clip/ })).toHaveAttribute('aria-disabled', 'true');
    expect(within(menu).getByText('Move the playhead inside the clip')).toBeInTheDocument();
    await act(async () => { fireEvent.click(within(menu).getByRole('menuitem', { name: /Duplicate clip/ })); });
    expect(Object.keys(useProjectStore.getState().clips)).toHaveLength(3);
  });
});
