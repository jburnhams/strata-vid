import React from 'react';
import { act, createEvent, fireEvent, screen } from '@testing-library/react';
import { renderWithStrata } from 'strata-react/testing';
import { TimelinePanel } from '../../src/components/TimelinePanel';
import { useProjectStore } from '../../src/store/useProjectStore';
import { ASSET_DRAG_TYPE } from '../../src/utils/timelinePlacement';
import type { Asset, Track } from '../../src/types';

// Library files dragged onto a lane (strata-react #121's drops from outside). The library row starts
// a native drag carrying the asset's id; the timeline reads it where it lands.

const empty = useProjectStore.getState();
const run: Asset = { id: 'a-run', name: 'run.mp4', type: 'video', src: 'blob:run', duration: 8 };
const video: Track = { id: 't-video', type: 'video', label: 'Track 1', isMuted: false, isLocked: false, volume: 1, clips: [] };
const audio: Track = { id: 't-audio', type: 'audio', label: 'Audio', isMuted: false, isLocked: false, volume: 1, clips: [] };

function drag(target: HTMLElement, clientX: number, assetId: string) {
  const dataTransfer = {
    types: [ASSET_DRAG_TYPE],
    items: [{ kind: 'string', type: ASSET_DRAG_TYPE, getAsString: (cb: (s: string) => void) => cb(assetId), getAsFile: () => null }],
    getData: () => assetId,
    dropEffect: 'copy',
    effectAllowed: 'all',
  };
  // jsdom's drag events carry no coordinates, so they are set on the event.
  const send = (name: 'dragEnter' | 'dragOver' | 'drop') => {
    const event = createEvent[name](target, { dataTransfer });
    Object.defineProperty(event, 'clientX', { value: clientX });
    Object.defineProperty(event, 'clientY', { value: 0 });
    fireEvent(target, event);
  };
  send('dragEnter');
  send('dragOver');
  return { drop: () => send('drop') };
}

describe('Dragging a library file onto the timeline', () => {
  beforeEach(() => {
    useProjectStore.setState({
      ...empty,
      assets: { [run.id]: run },
      tracks: { [video.id]: video, [audio.id]: audio },
      trackOrder: [video.id, audio.id],
      clips: {},
      zoomLevel: 10,
      draggedAssetId: run.id,
    }, true);
  });

  it('places the file where it lands, as long as the file', async () => {
    renderWithStrata(<TimelinePanel />);
    drag(screen.getByRole('group', { name: 'Track 1' }), 300, run.id).drop();

    await act(async () => {});
    const clips = Object.values(useProjectStore.getState().clips);
    expect(clips).toHaveLength(1);
    expect(clips[0]).toMatchObject({ assetId: run.id, trackId: video.id, start: 30, duration: 8 });
    expect(useProjectStore.getState().draggedAssetId).toBeNull();
  });

  it('refuses footage on an audio track, with the reason, while it is over the lane', async () => {
    renderWithStrata(<TimelinePanel />);
    const d = drag(screen.getByRole('group', { name: 'Audio' }), 300, run.id);
    expect(screen.getByText('Audio is for sound.')).toBeInTheDocument();
    d.drop();

    await act(async () => {});
    expect(useProjectStore.getState().clips).toEqual({});
  });
});
