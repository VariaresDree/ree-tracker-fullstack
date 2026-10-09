import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import PaceIndicator from './PaceIndicator';

afterEach(() => vi.useRealTimers());

describe('PaceIndicator', () => {
  it('compares answered items with an even pace, and keeps its own clock', () => {
    vi.useFakeTimers();
    const now = Date.now();
    // 100 items in 6000 s; half the time used → 50 expected.
    const { rerender } = render(<PaceIndicator endTime={now + 3000_000} totalSecs={6000} totalItems={100} answered={40} />);
    expect(screen.getByText('Behind by 10')).toBeInTheDocument();
    rerender(<PaceIndicator endTime={now + 3000_000} totalSecs={6000} totalItems={100} answered={50} />);
    expect(screen.getByText('On pace')).toBeInTheDocument();
    // Fifteen minutes on with no new answers: now behind.
    act(() => { vi.advanceTimersByTime(900_000); });
    expect(screen.getByText(/Behind by/)).toBeInTheDocument();
  });

  it('hides with the timer', () => {
    render(<PaceIndicator endTime={Date.now() + 1000} totalSecs={6000} totalItems={100} answered={0} hidden />);
    expect(screen.queryByText(/pace|Behind|Ahead/)).not.toBeInTheDocument();
  });
});
