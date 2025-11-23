import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LoadingOverlay } from '../../../src/components/LoadingOverlay';
import { useProjectStore } from '../../../src/store/useProjectStore';

jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader" />,
}));

describe('LoadingOverlay', () => {
  beforeEach(() => {
    useProjectStore.setState({
      isLoading: false,
      loadingMessage: null,
    });
  });

  it('should not render when isLoading is false', () => {
    const { container } = render(<LoadingOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when isLoading is true', () => {
    act(() => {
      useProjectStore.getState().setLoading(true);
    });
    render(<LoadingOverlay />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('should render custom message', () => {
    act(() => {
      useProjectStore.getState().setLoading(true, 'Processing...');
    });
    render(<LoadingOverlay />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});
