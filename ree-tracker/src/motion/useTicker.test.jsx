// src/motion/useTicker.test.jsx
// The dashboard's headline KPIs looked static despite this ticker being wired
// into Stat all along: `display` and `prev` both initialise to `value`, so the
// equality guard short-circuits on first paint and the number just appears.
// `animateOnMount` is the opt-in that makes the reveal actually animate —
// these lock both behaviours so neither regresses into the other.
import { StrictMode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useTicker } from './useTicker';

function Probe({ value, animateOnMount }) {
  const live = useTicker(value, 600, { animateOnMount });
  return <span data-testid="v">{Math.round(live)}</span>;
}

afterEach(() => vi.useRealTimers());

describe('useTicker', () => {
  it('shows the final value immediately by default (no spontaneous count-up)', () => {
    render(<Probe value={960} />);
    // A number merely present on screen shouldn't animate itself unasked.
    expect(screen.getByTestId('v')).toHaveTextContent('960');
  });

  it('starts from zero on mount when animateOnMount is set', () => {
    render(<Probe value={960} animateOnMount />);
    // First paint is the start of the count-up, not the destination.
    expect(screen.getByTestId('v')).toHaveTextContent('0');
  });

  // These poll with waitFor rather than sleeping a fixed duration: tickTo is
  // driven by requestAnimationFrame, and jsdom's rAF runs well behind wall
  // clock (a fixed 900ms wait landed mid-animation at 78/90). Polling asserts
  // the destination is genuinely reached without coupling to frame timing.
  it('reaches the target value once the animation completes', async () => {
    render(<Probe value={960} animateOnMount />);
    await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('960'), { timeout: 4000 });
  });

  it('animates between values on update regardless of the mount option', async () => {
    const { rerender } = render(<Probe value={10} />);
    expect(screen.getByTestId('v')).toHaveTextContent('10');
    rerender(<Probe value={90} />);
    await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('90'), { timeout: 4000 });
  });

  it('still settles on the real value when requestAnimationFrame never fires', async () => {
    // Browsers suspend rAF in background/hidden tabs, and some embedded
    // webviews never composite at all — observed directly as 0 frames in 40s.
    // Without tickTo's watchdog the number would be stranded at its starting
    // value (0 with animateOnMount), i.e. the UI would display a WRONG figure
    // indefinitely. Correctness has to survive a dead animation clock.
    const realRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = () => 0; // queued, never serviced
    try {
      render(<Probe value={977} animateOnMount />);
      await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('977'), { timeout: 4000 });
    } finally {
      globalThis.requestAnimationFrame = realRaf;
    }
  });

  it('still reaches the target under StrictMode double-invoked effects', async () => {
    // Regression: the hook used to commit `prev.current = value` synchronously
    // at animation START. StrictMode runs the effect, tears it down (cancelling
    // the rAF), then runs it again — where the guard now saw prev === value and
    // bailed. Nothing animated, and with animateOnMount the number was stranded
    // at 0. The app renders under StrictMode, so this is the real-world path.
    render(
      <StrictMode>
        <Probe value={977} animateOnMount />
      </StrictMode>,
    );
    await waitFor(() => expect(screen.getByTestId('v')).toHaveTextContent('977'), { timeout: 4000 });
  });
});
