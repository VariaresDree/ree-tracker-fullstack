// Phone ergonomics from the 2026-10-02 audit (Wave 3):
//   - the closed mobile drawer was only translated off-screen, so Tab and a
//     screen reader still walked through every hidden link; the menu button
//     didn't say whether it was open and Escape did nothing;
//   - the Scratchpad overlay had no dialog semantics or Escape, and drew blurry
//     on high-density screens (backing store at CSS size, taken from the parent
//     so it also included the header — strokes landed off the finger);
//   - a list of controls measured under 44px on touch screens.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import MainLayout from './MainLayout';
import Scratchpad from '../components/Scratchpad';
import ActivityCalendar from '../features/profile/ActivityCalendar';

vi.mock('../components/Pomodoro', () => ({ default: () => null }));
vi.mock('../components/FloatingPomodoro', () => ({ default: () => null }));
vi.mock('../components/OfflineStatusBadge', () => ({ default: () => null }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { displayName: 'Rey' } }) }));
vi.mock('../store/slices', async () => {
    const { create } = await import('zustand');
    const useUI = create((set) => ({
        isSidebarOpen: false,
        isSidebarCollapsed: false,
        theme: 'dark',
        setSidebarOpen: (v) => set({ isSidebarOpen: v }),
        toggleSidebarCollapse: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
    }));
    return { useUISlice: () => useUI() };
});

const originalMatchMedia = window.matchMedia;
afterEach(() => { window.matchMedia = originalMatchMedia; });
const desktop = () => {
    window.matchMedia = (q) => ({ ...originalMatchMedia(q), matches: q.includes('min-width: 768px') });
};

const layout = () => render(<MemoryRouter><MainLayout><p>page</p></MainLayout></MemoryRouter>);
const drawer = () => screen.getByRole('complementary', { hidden: true });

describe('mobile navigation drawer', () => {
    it('is out of the tab order and the accessibility tree while closed', () => {
        layout();
        const menu = screen.getByRole('button', { name: 'Open navigation menu' });
        expect(menu).toHaveAttribute('aria-expanded', 'false');
        expect(menu).toHaveAttribute('aria-controls', drawer().id);
        expect(drawer()).toHaveAttribute('inert');
    });

    it('opens with focus inside, and Escape closes it and returns focus', () => {
        layout();
        const menu = screen.getByRole('button', { name: 'Open navigation menu' });
        menu.focus();
        fireEvent.click(menu);
        expect(menu).toHaveAttribute('aria-expanded', 'true');
        expect(drawer()).not.toHaveAttribute('inert');
        expect(document.activeElement).toHaveAccessibleName('Close navigation menu');

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(menu).toHaveAttribute('aria-expanded', 'false');
        expect(document.activeElement).toBe(menu);
    });

    it('on a desktop the sidebar is always reachable', () => {
        desktop();
        layout();
        expect(drawer()).not.toHaveAttribute('inert');
    });
});

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
