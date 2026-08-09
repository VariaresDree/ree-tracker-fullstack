// src/components/BootSequence.test.jsx
// Locks the escalating-disclosure contract. The design choice being protected:
// this screen must stay HONEST at every duration — no fabricated step-by-step
// progress (auth genuinely has one phase now), and no text that flashes in and
// vanishes on the common sub-second boot.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import BootSequence from './BootSequence';

describe('BootSequence — escalating disclosure', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows only the brand + label on a fast boot (no tip churn)', () => {
    render(<BootSequence />);
    expect(screen.getByText(/preparing your session/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'REE.ai' })).toBeInTheDocument();
    // Nothing that would flash-and-vanish on a sub-second resolve.
    expect(screen.queryByText(/blind spots|interleaving|spaced repetition|calibration|PRC blend/i))
      .not.toBeInTheDocument();
    expect(screen.queryByText(/taking longer than usual/i)).not.toBeInTheDocument();
  });

  it('surfaces a board-exam tip once the wait is long enough to be worth filling', () => {
    render(<BootSequence />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(/blind spots|interleaving|spaced repetition|calibration|PRC blend/i))
      .toBeInTheDocument();
    // Still not claiming anything is wrong yet.
    expect(screen.queryByText(/taking longer than usual/i)).not.toBeInTheDocument();
  });

  it('acknowledges a genuinely slow boot rather than silently hanging', () => {
    render(<BootSequence />);
    act(() => { vi.advanceTimersByTime(6500); });
    expect(screen.getByText(/taking longer than usual/i)).toBeInTheDocument();
  });

  it('announces itself politely to assistive tech', () => {
    render(<BootSequence />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('accepts a custom label so other surfaces can reuse it', () => {
    render(<BootSequence label="Loading module" />);
    expect(screen.getByText('Loading module')).toBeInTheDocument();
  });
});
