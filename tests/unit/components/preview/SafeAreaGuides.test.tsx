import React from 'react';
import { render } from '@testing-library/react';
import { SafeAreaGuides } from '../../../../src/components/preview/SafeAreaGuides';
import '@testing-library/jest-dom';

describe('SafeAreaGuides', () => {
  it('renders nothing when disabled', () => {
    const { container } = render(<SafeAreaGuides showSafeAreas={false} showGrid={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders safe areas when enabled', () => {
    const { getByTestId, queryByTestId } = render(<SafeAreaGuides showSafeAreas={true} showGrid={false} />);
    expect(getByTestId('guide-action-safe')).toBeInTheDocument();
    expect(getByTestId('guide-title-safe')).toBeInTheDocument();
    // Grid should be missing
    expect(queryByTestId('guide-grid-v1')).not.toBeInTheDocument();
  });

  it('renders grid when enabled', () => {
    const { getByTestId, queryByTestId } = render(<SafeAreaGuides showSafeAreas={false} showGrid={true} />);
    expect(getByTestId('guide-grid-v1')).toBeInTheDocument();
    // Safe areas should be missing
    expect(queryByTestId('guide-action-safe')).not.toBeInTheDocument();
  });
});
