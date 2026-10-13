import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import QuestionTimer from './QuestionTimer';

afterEach(() => vi.useRealTimers());

describe('QuestionTimer', () => {
  it('ticks on its own from the start time, and turns red past three minutes', () => {
    vi.useFakeTimers();
    const start = Date.now();
    render(<QuestionTimer startedAt={start} running />);
    expect(screen.getByText('00:00')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText('00:02')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(180_000); });
    expect(screen.getByText('03:02')).toHaveAttribute('title', 'Over three minutes on this question');
  });

  it('holds its value once the question is answered', () => {
    vi.useFakeTimers();
    const start = Date.now();
    const { rerender } = render(<QuestionTimer startedAt={start} running />);
    act(() => { vi.advanceTimersByTime(5000); });
    rerender(<QuestionTimer startedAt={start} running={false} />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.getByText('00:05')).toBeInTheDocument();
  });
});
