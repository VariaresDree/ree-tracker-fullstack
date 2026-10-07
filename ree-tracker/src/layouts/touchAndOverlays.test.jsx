// Phone ergonomics from the 2026-10-02 audit (Wave 3). (The mobile drawer
// these once covered is gone; the shell is tested in appShell.test.jsx.)
//   - the Scratchpad overlay had no dialog semantics or Escape, and drew blurry
//     on high-density screens (backing store at CSS size, taken from the parent
//     so it also included the header — strokes landed off the finger);
//   - a list of controls measured under 44px on touch screens.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import Scratchpad from '../components/Scratchpad';
import ActivityCalendar from '../features/profile/ActivityCalendar';


describe('Scratchpad', () => {
    it('is a named dialog that takes focus and closes on Escape', () => {
        const onClose = vi.fn();
        render(<Scratchpad isOpen onClose={onClose} />);
        const dialog = screen.getByRole('dialog', { name: 'Scratchpad' });
        expect(dialog.contains(document.activeElement)).toBe(true);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
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

describe('touch targets', () => {
    it('the touch-target utility grows a control to 44px on coarse pointers only', () => {
        const css = fs.readFileSync(path.resolve(__dirname, '../styles/index.css'), 'utf8');
        const rule = css.match(/@utility touch-target\s*\{([\s\S]*?)\n\}/);
        expect(rule?.[1]).toMatch(/@media \(pointer: coarse\)/);
        expect(rule?.[1]).toMatch(/min-width: 2\.75rem/);
        expect(rule?.[1]).toMatch(/min-height: 2\.75rem/);
    });

    it('calendar month arrows are named and touch-sized', () => {
        act(() => { render(<ActivityCalendar activityCalendar={{}} />); });
        for (const name of ['Previous month', 'Next month']) {
            expect(screen.getByRole('button', { name }).className).toMatch(/\btouch-target\b/);
        }
    });
});
