import { act, renderHook } from '@testing-library/react';
import { AUTO_SAVE_DELAY_MS, AUTO_SAVE_KEY, useAutoSave } from '../../../src/hooks/useAutoSave';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { serializeProject } from '../../../src/utils/projectSerializer';
import type { Track } from '../../../src/types';

const empty = useProjectStore.getState();
const track: Track = { id: 't1', type: 'video', label: 'Track 1', isMuted: false, isLocked: false, volume: 1, clips: [] };
const store = () => useProjectStore.getState();

describe('useAutoSave', () => {
  beforeEach(() => {
    useProjectStore.setState(empty, true);
    window.localStorage.clear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('saves a moment after the project stops changing, and says so', async () => {
    const { result } = renderHook(() => useAutoSave());
    act(() => store().addTrack(track));
    expect(result.current.state.status).toBe('dirty');

    await act(async () => { jest.advanceTimersByTime(AUTO_SAVE_DELAY_MS); });

    expect(result.current.state.status).toBe('saved');
    expect(JSON.parse(window.localStorage.getItem(AUTO_SAVE_KEY)!).timeline.tracks.t1).toBeDefined();
  });

  it('restores the last auto-save into an empty editor', () => {
    useProjectStore.setState({ tracks: { t1: track }, trackOrder: ['t1'] });
    window.localStorage.setItem(AUTO_SAVE_KEY, serializeProject(store()));
    useProjectStore.setState(empty, true);

    renderHook(() => useAutoSave());

    expect(store().tracks.t1).toBeDefined();
  });

  it('does not restore over a project that is open', () => {
    window.localStorage.setItem(AUTO_SAVE_KEY, serializeProject({ ...store(), tracks: { t9: { ...track, id: 't9' } }, trackOrder: ['t9'] }));
    useProjectStore.setState({ tracks: { t1: track }, trackOrder: ['t1'] });

    renderHook(() => useAutoSave());

    expect(store().tracks.t9).toBeUndefined();
  });

  it('says why a save failed when storage is full', async () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const { result } = renderHook(() => useAutoSave());
    act(() => store().addTrack(track));

    await act(async () => { jest.advanceTimersByTime(AUTO_SAVE_DELAY_MS); });

    expect(result.current.state).toEqual({ status: 'failed', reason: 'The browser’s storage for this site is full.' });
  });
});
