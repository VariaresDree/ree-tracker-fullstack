// Landmarks and motion (2026-10-02 audit, Wave 3):
//   - no skip link: a keyboard user tabbed through the header and the whole
//     navigation on every page;
//   - both layouts' <main> had overflow-y-auto with no fixed height, so it never
//     scrolled (the window does) yet still captured every `sticky` child — the
//     exam toolbar and its clock scrolled away, ReviewSetup's mobile Start bar
//     never stuck;
//   - .page-fade-in kept a transform on <main> after it finished (fill
//     `forwards`), making <main> the containing block for position:fixed;
//   - animate-in / fade-in / slide-in-from-* were used ~190 times and defined
//     nowhere (the tailwindcss-animate plugin was never installed).
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Link, Routes, Route } from 'react-router-dom';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import MainLayout from './MainLayout';
import ExamLayout from './ExamLayout';

vi.mock('../components/Pomodoro', () => ({ default: () => null }));
vi.mock('../components/FloatingPomodoro', () => ({ default: () => null }));
vi.mock('../components/OfflineStatusBadge', () => ({ default: () => null }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { displayName: 'Rey' }, isAdmin: false, roleResolved: true, logout: vi.fn() }) }));
vi.mock('../store/useStore', () => ({ useStore: (sel) => sel({ syncQueue: [], pendingWrites: [], resetStore: vi.fn() }) }));
vi.mock('../store/slices', async () => {
    const { create } = await import('zustand');
    const useUI = create((set) => ({
        isSidebarCollapsed: false, theme: 'dark',
        toggleSidebarCollapse: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
    }));
    return { useUISlice: () => useUI() };
});

const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('MainLayout landmarks', () => {
    it('the first link skips to the page, and the page can take focus', () => {
        render(<MemoryRouter><MainLayout><p>page</p></MainLayout></MemoryRouter>);
        const [first] = screen.getAllByRole('link');
        expect(first).toHaveAccessibleName('Skip to main content');
        expect(first).toHaveAttribute('href', '#main-content');
        const main = screen.getByRole('main');
        expect(main).toHaveAttribute('id', 'main-content');
        expect(main).toHaveAttribute('tabindex', '-1');
    });

    it('a change of page moves focus to the page; first load does not', () => {
        render(
            <MemoryRouter initialEntries={['/a']}>
                <MainLayout>
                    <Link to="/b">Go to B</Link>
                    <Routes><Route path="/a" element={<p>A</p>} /><Route path="/b" element={<p>B</p>} /></Routes>
                </MainLayout>
            </MemoryRouter>,
        );
        expect(document.activeElement).not.toBe(screen.getByRole('main'));
        const link = screen.getByRole('link', { name: 'Go to B' });
        link.focus();
        fireEvent.click(link);
        expect(screen.getByText('B')).toBeInTheDocument();
        expect(document.activeElement).toBe(screen.getByRole('main'));
    });

    it('a section link waits for a page that mounts late', async () => {
        const scrolled = vi.fn();
        function Late() {
            // Mounts its section a moment after the layout's effect ran, as a lazy page does.
            const [ready, setReady] = React.useState(false);
            React.useEffect(() => { const t = setTimeout(() => setReady(true), 20); return () => clearTimeout(t); }, []);
            return ready ? <section id="offline" ref={(el) => { if (el) el.scrollIntoView = scrolled; }}>Offline</section> : null;
        }
        render(<MemoryRouter initialEntries={['/account#offline']}><MainLayout><Late /></MainLayout></MemoryRouter>);
        expect(scrolled).not.toHaveBeenCalled();
        await act(() => new Promise((r) => setTimeout(r, 60)));
        expect(scrolled).toHaveBeenCalled();
    });

    it('<main> does not capture sticky children', () => {
        render(<MemoryRouter><MainLayout><p>page</p></MainLayout></MemoryRouter>);
        expect(screen.getByRole('main').className).not.toMatch(/overflow-y-auto/);
        expect(screen.getByRole('main').className).toMatch(/overflow-x-clip/);
    });
});

describe('ExamLayout', () => {
    it('<main> does not capture the sticky exam toolbar', () => {
        render(<ExamLayout><p>q</p></ExamLayout>);
        expect(screen.getByRole('main').className).not.toMatch(/overflow-y-auto/);
        expect(screen.getByRole('main').className).toMatch(/overflow-x-clip/);
    });
});

describe('motion utilities', () => {
    it('animate-in exists, leaves no transform behind, and stops under reduced motion', () => {
        const rule = css.match(/@utility animate-in\s*\{([\s\S]*?)\n\}/)?.[1] || '';
        expect(rule).toMatch(/animation: tw-enter .* backwards;/);
        expect(rule).toMatch(/prefers-reduced-motion: reduce[\s\S]*animation: none/);
        for (const u of ['fade-in', 'slide-in-from-bottom-\\*', 'slide-in-from-top-\\*']) {
            expect(css).toMatch(new RegExp(`@utility ${u}\\s*\\{`));
        }
    });

    it('.page-fade-in does not fill forwards', () => {
        const rule = css.match(/\.page-fade-in\s*\{([^}]*)\}/)?.[1] || '';
        expect(rule).toMatch(/animation:/);
        expect(rule).not.toMatch(/forwards/);
    });
});
