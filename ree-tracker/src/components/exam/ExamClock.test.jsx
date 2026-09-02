import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ExamClock, { remainingSecs, CRITICAL_SECS } from './ExamClock';

// The point of this component is CONTAINMENT: the clock ticks every second for
// up to six hours, and nothing outside it may re-render as a result. The engines
// used to hold `timeRemaining` in the hook the page consumes, so every tick
// reconciled SimulatorActive, the QuestionCard's KaTeX subtree and ExamNavigator's
// one-button-per-question grid — roughly 100 buttons plus a LaTeX render, 3,600
// times an hour, on low-end Android.

beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: false }); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const advance = (secs) => act(() => { vi.advanceTimersByTime(secs * 1000); });

describe('remainingSecs', () => {
    it('is derived from an absolute deadline, not decremented', () => {
        const now = 1_000_000;
        expect(remainingSecs(now + 90_000, now)).toBe(90);
        // Recomputing from the clock is what makes a throttled background tab
        // self-correct instead of drifting.
        expect(remainingSecs(now + 90_000, now + 60_000)).toBe(30);
    });

    it('floors at zero and tolerates a missing deadline', () => {
        expect(remainingSecs(1000, 999_999)).toBe(0);
        expect(remainingSecs(null)).toBe(0);
        expect(remainingSecs(undefined)).toBe(0);
    });
});

describe('ExamClock rendering', () => {
    it('shows the time remaining and counts down on its own', () => {
        render(<ExamClock endTime={Date.now() + 65_000} />);
        expect(screen.getByTestId('exam-clock')).toHaveTextContent('01:05');

        advance(5);
        expect(screen.getByTestId('exam-clock')).toHaveTextContent('01:00');
    });

    it('marks the final five minutes as critical', () => {
        const { rerender } = render(<ExamClock endTime={Date.now() + (CRITICAL_SECS + 10) * 1000} />);
        expect(screen.getByTestId('exam-clock').className).not.toMatch(/animate-pulse/);

        rerender(<ExamClock endTime={Date.now() + (CRITICAL_SECS - 10) * 1000} />);
        expect(screen.getByTestId('exam-clock').className).toMatch(/animate-pulse/);
    });

    it('does not tick while paused', () => {
        render(<ExamClock endTime={Date.now() + 60_000} paused />);
        const before = screen.getByTestId('exam-clock').textContent;
        advance(5);
        expect(screen.getByTestId('exam-clock').textContent).toBe(before);
    });
});

describe('expiry', () => {
    it('reports expiry exactly ONCE, not on every subsequent tick', () => {
        const onExpire = vi.fn();
        render(<ExamClock endTime={Date.now() + 2_000} onExpire={onExpire} />);
        expect(onExpire).not.toHaveBeenCalled();

        advance(3);
        expect(onExpire).toHaveBeenCalledTimes(1);

        // The clock keeps ticking at zero; auto-submit must not be re-triggered.
        advance(10);
        expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('does not fire while paused', () => {
        const onExpire = vi.fn();
        render(<ExamClock endTime={Date.now() - 1000} onExpire={onExpire} paused />);
        advance(3);
        expect(onExpire).not.toHaveBeenCalled();
    });
});

describe('render containment', () => {
    it('a tick re-renders the clock and NOTHING else', () => {
        const siblingRenders = vi.fn();

        function ExpensiveSibling() {
            siblingRenders();
            return <div data-testid="sibling">100 navigator buttons + KaTeX live here</div>;
        }

        function ExamScreen() {
            // `endTime` is a stable absolute deadline, so the parent has no
            // per-second state and never re-renders on a tick.
            const endTime = Date.now() + 600_000;
            return (
                <div>
                    <ExamClock endTime={endTime} />
                    <ExpensiveSibling />
                </div>
            );
        }

        render(<ExamScreen />);
        expect(siblingRenders).toHaveBeenCalledTimes(1);

        advance(10);

        // The clock advanced...
        expect(screen.getByTestId('exam-clock')).toHaveTextContent('09:50');
        // ...and the expensive subtree was never reconciled again. This is the
        // whole reason the component exists.
        expect(siblingRenders).toHaveBeenCalledTimes(1);
    });
});
