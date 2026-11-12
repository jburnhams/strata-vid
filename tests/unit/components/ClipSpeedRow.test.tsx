import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStrata } from 'strata-react/testing';
import { ClipSpeedRow } from '../../../src/components/ClipSpeedRow';
import { useProjectStore } from '../../../src/store/useProjectStore';
import type { Clip, Track } from '../../../src/types';

const empty = useProjectStore.getState();
const clip = (id: string, start: number): Clip => ({
  id, assetId: id, trackId: 't1', start, duration: 8, offset: 0, type: 'video',
  properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
});
const track: Track = { id: 't1', type: 'video', label: 'Track 1', isMuted: false, isLocked: false, volume: 1, clips: ['a', 'b'] };

const field = () => screen.getByRole('textbox', { name: 'Speed' });

describe('ClipSpeedRow', () => {
  beforeEach(() => {
    useProjectStore.setState({
      ...empty,
      tracks: { t1: track },
      trackOrder: ['t1'],
      clips: { a: clip('a', 0), b: clip('b', 8) },
      assets: { b: { id: 'b', name: 'woods.mp4', type: 'video', src: '', duration: 8 } },
    }, true);
  });

  it('speeds the clip up, keeping the same stretch of the file', async () => {
    renderWithStrata(<ClipSpeedRow clip={useProjectStore.getState().clips.a} />);
    await userEvent.clear(field());
    await userEvent.type(field(), '2{Enter}');
    expect(useProjectStore.getState().clips.a).toMatchObject({ playbackRate: 2, duration: 4 });
  });

  it('refuses a slower speed that would run into the next clip, and names it', async () => {
    renderWithStrata(<ClipSpeedRow clip={useProjectStore.getState().clips.a} />);
    await userEvent.clear(field());
    await userEvent.type(field(), '0.5{Enter}');
    expect(screen.getByText('At 0.5× the clip would run into woods.mp4. Move it or allow overlaps.')).toBeInTheDocument();
    expect(useProjectStore.getState().clips.a.playbackRate).toBeUndefined();
  });
});
