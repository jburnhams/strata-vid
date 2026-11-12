import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithStrata } from 'strata-react/testing';
import { ClipColourRows } from '../../../src/components/ClipColourRows';
import { useProjectStore } from '../../../src/store/useProjectStore';
import type { Clip } from '../../../src/types';

const empty = useProjectStore.getState();
const clip: Clip = {
  id: 'a', assetId: 'a', trackId: 't1', start: 0, duration: 8, offset: 0, type: 'video',
  properties: { x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, zIndex: 0 },
};

describe('ClipColourRows', () => {
  beforeEach(() => useProjectStore.setState({ ...empty, clips: { a: clip } }, true));

  it('sets brightness as the clip filter, from the keyboard', () => {
    renderWithStrata(<ClipColourRows clip={clip} />);
    const slider = screen.getByRole('slider', { name: 'Brightness' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(useProjectStore.getState().clips.a.properties.filter).toBe('brightness(1.01)');
  });

  it('offers a reset only for a changed value', () => {
    const changed = { ...clip, properties: { ...clip.properties, filter: 'saturate(0)' } };
    renderWithStrata(<ClipColourRows clip={changed} />);
    expect(screen.getByRole('button', { name: 'Reset saturation' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset brightness' })).not.toBeInTheDocument();
  });
});
