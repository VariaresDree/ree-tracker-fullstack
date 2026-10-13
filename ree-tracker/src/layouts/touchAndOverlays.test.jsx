// Phone ergonomics from the 2026-10-02 audit (Wave 3). (The mobile drawer
// these once covered is gone; the shell is tested in appShell.test.jsx.)
//   - the Scratchpad overlay had no dialog semantics or Escape, and drew blurry
//     on high-density screens (backing store at CSS size, taken from the parent
//     so it also included the header — strokes landed off the finger);
//   - a list of controls measured under 44px on touch screens.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { todayManila } from '../utils/manilaDate';
import fs from 'node:fs';
import path from 'node:path';
import Scratchpad from '../components/Scratchpad';
import ActivityCalendar from '../features/profile/ActivityCalendar';
import FullscreenPdfViewer from '../components/FullscreenPdfViewer';
import FloatingPomodoro from '../components/FloatingPomodoro';

// The floating timer, pinned and paused, without the persisted store.
const widget = { pinned: true, dismissed: false, x: null, y: null };
vi.mock('../store/slices', () => ({
    useSessionSlice: () => ({ startPomodoro: vi.fn(), pausePomodoro: vi.fn(), pomodoroWidget: widget, setPomodoroWidget: vi.fn() }),
}));
vi.mock('../hooks/usePomodoroClock', () => ({
    usePomodoroClock: () => ({ pomodoro: { isWork: true, isRunning: false }, remaining: 600 }),
    formatClock: () => '10:00',
}));

describe('Scratchpad', () => {
    it('is a named dialog that takes focus and closes on Escape', () => {
        const onClose = vi.fn();
        render(<Scratchpad isOpen onClose={onClose} />);
        const dialog = screen.getByRole('dialog', { name: 'Scratchpad' });
        expect(dialog.contains(document.activeElement)).toBe(true);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // Both were z-[70]: on a phone the floating timer sat on the sheet.
    it('the floating Pomodoro steps aside while it is open, and comes back after', () => {
        const ui = (open) => <><FloatingPomodoro /><Scratchpad isOpen={open} onClose={() => {}} /></>;
        const { rerender } = render(ui(false));
        expect(screen.getByRole('timer')).toBeInTheDocument();
        rerender(ui(true));
        expect(screen.queryByRole('timer')).toBeNull();
        rerender(ui(false));
        expect(screen.getByRole('timer')).toBeInTheDocument();
    });

    it('its buttons are touch-sized', () => {
        render(<Scratchpad isOpen onClose={() => {}} />);
        for (const name of ['Clear', 'Close']) {
            expect(screen.getByRole('button', { name }).className).toMatch(/\btouch-target\b/);
        }
    });

    it('sizes the canvas backing store to the device pixel ratio', () => {
        const dpr = window.devicePixelRatio;
        window.devicePixelRatio = 2;
        const rect = vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect')
            .mockReturnValue({ width: 300, height: 200, left: 0, top: 0, right: 300, bottom: 200 });
        render(<Scratchpad isOpen onClose={() => {}} />);
        const canvas = document.querySelector('canvas');
        expect([canvas.width, canvas.height]).toEqual([600, 400]);
        rect.mockRestore();
        window.devicePixelRatio = dpr;
    });
});

// The count was a hover-only tooltip and the legend's labels were hidden on
// phones; day numbers were white on the green at about 2.3:1.
describe('Study calendar', () => {
    const today = todayManila();
    // Another day this month: the 1st, or the 2nd when today is the 1st.
    const other = `${today.slice(0, 8)}${today.endsWith('-01') ? '02' : '01'}`;
    const cal = () => act(() => { render(<ActivityCalendar activityCalendar={{ [today]: 12, [other]: 60 }} targetQuota={50} />); });
    const line = () => screen.getByText(/questions? answered$|no questions answered$/, { selector: 'p' });

    it('shows today’s count under the grid, and a tapped or focused day’s', () => {
        cal();
        expect(line()).toHaveTextContent(/\(today\): 12 questions answered$/);
        fireEvent.click(screen.getByRole('button', { name: /: 60 questions answered$/ }));
        expect(line()).toHaveTextContent(/: 60 questions answered$/);
        expect(line()).not.toHaveTextContent('today');
    });

    it('is one tab stop, and the arrow keys move between days', () => {
        cal();
        const days = within(screen.getByRole('group', { name: /^Questions answered each day/ })).getAllByRole('button');
        expect(days.filter((d) => d.tabIndex === 0)).toHaveLength(1);
        expect(days.find((d) => d.tabIndex === 0)).toHaveAttribute('aria-current', 'date');
        fireEvent.keyDown(days[0], { key: 'Home' });
        expect(document.activeElement).toBe(days[0]);
        fireEvent.keyDown(days[0], { key: 'ArrowRight' });
        expect(document.activeElement).toBe(days[1]);
        fireEvent.keyDown(days[1], { key: 'ArrowDown' });
        expect(document.activeElement).toBe(days[8]);
    });

    it('fills a day in its level’s ink, and labels the legend on phones too', () => {
        cal();
        const full = screen.getByRole('button', { name: /: 60 questions answered$/ });
        expect(full.style.color).toBe('var(--on-success)');
        expect(full.className).not.toMatch(/text-white/);
        expect(screen.getByText('50+ Qs').className).not.toMatch(/\bhidden\b/);
    });
});

describe('touch targets', () => {
    it('the touch-target utility grows a control to 44px on coarse pointers only', () => {
        const css = fs.readFileSync(path.resolve(__dirname, '../styles/index.css'), 'utf8');
        const rule = css.match(/@utility touch-target\s*\{([\s\S]*?)\n\}/);
        expect(rule?.[1]).toMatch(/@media \(pointer: coarse\)/);
        expect(rule?.[1]).toMatch(/min-width: 2\.75rem/);
        expect(rule?.[1]).toMatch(/min-height: 2\.75rem/);
    });

    it('the fullscreen handout viewer’s Zoom and Close grow to 44px on touch', () => {
        render(<FullscreenPdfViewer url="https://example.com/a.pdf" title="AC notes" onClose={() => {}} />);
        for (const name of ['Zoom in', 'Close fullscreen viewer']) {
            expect(screen.getByRole('button', { name }).className).toMatch(/pointer-coarse:h-11/);
        }
    });

    it('calendar month arrows are named and touch-sized', () => {
        act(() => { render(<ActivityCalendar activityCalendar={{}} />); });
        for (const name of ['Previous month', 'Next month']) {
            expect(screen.getByRole('button', { name }).className).toMatch(/\btouch-target\b/);
        }
    });
});
