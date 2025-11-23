import { renderHook } from '@testing-library/react';
import { useAutoSave } from '../../../src/hooks/useAutoSave';
import { useProjectStore } from '../../../src/store/useProjectStore';
import { serializeProject, deserializeProject, applyProjectState } from '../../../src/utils/projectSerializer';

jest.mock('../../../src/store/useProjectStore');
jest.mock('../../../src/utils/projectSerializer');

describe('useAutoSave', () => {
  const mockStore = {
    assets: {},
    tracks: {},
    addAsset: jest.fn(),
    setSettings: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock local storage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
      },
      writable: true,
    });

    (useProjectStore as unknown as jest.Mock).mockReturnValue(mockStore);
    // Mock getState
    (useProjectStore as any).getState = jest.fn().mockReturnValue(mockStore);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should restore from local storage on mount if store is empty', () => {
    const savedState = { mock: 'state' };
    (window.localStorage.getItem as jest.Mock).mockReturnValue('json-string');
    (deserializeProject as jest.Mock).mockReturnValue(savedState);

    // Store is empty
    (useProjectStore as any).getState.mockReturnValue({ assets: {}, tracks: {} });

    renderHook(() => useAutoSave());

    expect(window.localStorage.getItem).toHaveBeenCalledWith('strata_vid_autosave');
    expect(deserializeProject).toHaveBeenCalledWith('json-string');
    expect(applyProjectState).toHaveBeenCalledWith(mockStore, savedState);
  });

  it('should NOT restore if store has data', () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue('json-string');
    (deserializeProject as jest.Mock).mockReturnValue({});

    // Store has data
    (useProjectStore as any).getState.mockReturnValue({ assets: { a1: {} }, tracks: {} });

    renderHook(() => useAutoSave());

    expect(applyProjectState).not.toHaveBeenCalled();
  });

  it('should save to local storage periodically', () => {
    // Mock state for save
    const stateToSave = { assets: { a1: {} }, tracks: {} };
    (useProjectStore as any).getState.mockReturnValue(stateToSave);
    (serializeProject as jest.Mock).mockReturnValue('serialized-json');

    renderHook(() => useAutoSave());

    // Advance time
    jest.advanceTimersByTime(60000);

    expect(serializeProject).toHaveBeenCalledWith(stateToSave);
    expect(window.localStorage.setItem).toHaveBeenCalledWith('strata_vid_autosave', 'serialized-json');
  });

  it('should NOT save if store is empty', () => {
    (useProjectStore as any).getState.mockReturnValue({ assets: {}, tracks: {} });

    renderHook(() => useAutoSave());

    jest.advanceTimersByTime(60000);

    expect(serializeProject).not.toHaveBeenCalled();
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
  });
});
