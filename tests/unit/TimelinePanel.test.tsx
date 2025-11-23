import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimelinePanel } from '../../src/components/TimelinePanel';
import { useProjectStore } from '../../src/store/useProjectStore';

// Mock the store
jest.mock('../../src/store/useProjectStore', () => ({
  useProjectStore: jest.fn(),
}));

// Mock child components to simplify test
jest.mock('../../src/components/timeline/TimelineContainer', () => ({
  TimelineContainer: ({ trackOrder }: { trackOrder: string[] }) => (
    <div data-testid="timeline-container">
      Timeline Container {trackOrder.length} tracks
    </div>
  ),
}));

describe('TimelinePanel', () => {
  const mockMoveClip = jest.fn();
  const mockRemoveTrack = jest.fn();

  beforeEach(() => {
    (useProjectStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
            tracks: { 't1': { id: 't1' } },
            clips: { 'c1': { id: 'c1' } },
            trackOrder: ['t1'],
            moveClip: mockMoveClip,
            removeTrack: mockRemoveTrack,
        };
        return selector(state);
    });
  });

  it('renders timeline container', () => {
    render(<TimelinePanel />);
    expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
    expect(screen.getByText('Timeline Container 1 tracks')).toBeInTheDocument();
  });
});
