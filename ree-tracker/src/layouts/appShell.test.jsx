// The app shell (2026-10 reorganization): five destinations — Today,
// Practice, Exams, Progress, Library — in a phone bottom bar and a desktop
// sidebar, both from layouts/navModel.js. The phone's hamburger drawer is gone;
// Account, Admin and Log out sit behind the avatar.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MainLayout from './MainLayout';

vi.mock('../components/Pomodoro', () => ({ default: () => null }));
vi.mock('../components/FloatingPomodoro', () => ({ default: () => null }));
vi.mock('../components/OfflineStatusBadge', () => ({ default: () => <span data-testid="offline-badge" /> }));
const auth = { currentUser: { displayName: 'Rey', email: 'rey@example.com' }, isAdmin: false, roleResolved: true, logout: vi.fn() };
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));
const storeState = { syncQueue: [], pendingWrites: [], resetStore: vi.fn() };
vi.mock('../store/useStore', () => ({ useStore: (sel) => sel(storeState) }));
vi.mock('../store/slices', async () => {
    const { create } = await import('zustand');
    const useUI = create((set) => ({
        isSidebarCollapsed: false,
        theme: 'dark',
        toggleSidebarCollapse: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
    }));
    return { useUISlice: () => useUI() };
});

const originalMatchMedia = window.matchMedia;
const desktop = () => {
    window.matchMedia = (q) => ({ ...originalMatchMedia(q), matches: q.includes('min-width: 768px') });
};
beforeEach(() => { auth.isAdmin = false; storeState.syncQueue = []; storeState.pendingWrites = []; });
afterEach(() => { window.matchMedia = originalMatchMedia; });

const at = (path) => render(<MemoryRouter initialEntries={[path]}><MainLayout><p>page</p></MainLayout></MemoryRouter>);
const primaryNav = () => screen.getByRole('navigation', { name: 'Primary' });

describe('phone shell', () => {
    it('a bottom bar with exactly the five destinations, and no drawer', () => {
        at('/');
        const links = within(primaryNav()).getAllByRole('link');
        expect(links.map((l) => l.textContent)).toEqual(['Today', 'Practice', 'Exams', 'Progress', 'Library']);
        expect(screen.queryByRole('button', { name: /navigation menu/i })).toBeNull();
    });

    it.each([
        ['/', 'Today'],
        ['/practice', 'Practice'],
        ['/simulator', 'Exams'],
        ['/battle/ABC', 'Exams'],
        ['/library', 'Library'],
    ])('on %s the bar marks %s as the current page', (path, label) => {
        at(path);
        const current = within(primaryNav()).getAllByRole('link').filter((l) => l.getAttribute('aria-current') === 'page');
        expect(current.map((l) => l.textContent)).toEqual([label]);
    });

    it('the account menu opens with focus inside and closes on Escape', () => {
        at('/');
        const avatar = screen.getByRole('button', { name: 'Account menu' });
        fireEvent.click(avatar);
        expect(avatar).toHaveAttribute('aria-expanded', 'true');
        expect(document.activeElement).toHaveTextContent('Account');
        expect(screen.queryByRole('link', { name: /admin/i })).toBeNull();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(avatar).toHaveAttribute('aria-expanded', 'false');
        expect(document.activeElement).toBe(avatar);
    });

    it('an admin also gets Admin in the account menu', () => {
        auth.isAdmin = true;
        at('/');
        fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
        expect(screen.getByRole('link', { name: /admin/i })).toHaveAttribute('href', '/admin');
    });

    it('logging out warns when answers have not synced yet', () => {
        storeState.syncQueue = [{}, {}, {}];
        at('/');
        fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
        fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
        expect(screen.getByRole('dialog')).toHaveTextContent('3 answers haven’t synced yet');
    });

    // Queued writes that aren't answers (an outside score saved offline, a
    // finished session) are counted, but not called answers.
    it('logging out names queued changes that aren’t answers for what they are', () => {
        storeState.syncQueue = [{}];
        storeState.pendingWrites = [{}, {}];
        at('/');
        fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
        fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
        expect(screen.getByRole('dialog')).toHaveTextContent('1 answer and 2 other changes haven’t synced yet');
    });

    it('mounts the offline badge once', () => {
        at('/');
        expect(screen.getAllByTestId('offline-badge')).toHaveLength(1);
    });
});

describe('desktop shell', () => {
    it('a sidebar with the five destinations and no bottom bar', () => {
        desktop();
        at('/progress');
        const links = within(primaryNav()).getAllByRole('link');
        expect(links).toHaveLength(5);
        expect(links.map((l) => l.getAttribute('href'))).toEqual(['/', '/practice', '/exams', '/progress', '/library']);
        expect(within(primaryNav()).getByRole('link', { current: 'page' })).toHaveTextContent('Progress');
        expect(screen.getAllByRole('navigation', { name: 'Primary' })).toHaveLength(1);
        expect(screen.getAllByTestId('offline-badge')).toHaveLength(1);
    });

    it('the sidebar has Log out, which asks first', () => {
        desktop();
        at('/');
        fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(auth.logout).not.toHaveBeenCalled();
    });

    it('the avatar falls back to the email initial', () => {
        desktop();
        const saved = auth.currentUser;
        auth.currentUser = { displayName: '', email: 'zed@example.com' };
        at('/');
        expect(screen.getByRole('link', { name: /Reviewer/ })).toHaveTextContent('Z');
        auth.currentUser = saved;
    });

    it('admins get an Admin link in the sidebar; learners do not', () => {
        desktop();
        at('/');
        expect(within(primaryNav()).queryByRole('link', { name: /admin/i })).toBeNull();
    });

    it('an admin sees it', () => {
        desktop();
        auth.isAdmin = true;
        at('/');
        expect(within(primaryNav()).getByRole('link', { name: /admin/i })).toHaveAttribute('href', '/admin');
    });
});

describe('sticky offsets', () => {
    // Sticky children (a mock's review toolbar, Practice's Start button) read
    // these from whichever layout they're in.
    it('on a phone, clear the header and the bottom bar, safe areas included', () => {
        const { container } = at('/');
        const root = container.firstChild;
        // The header sizes itself from --phone-header-h; sticky children sit below it.
        expect(root.style.getPropertyValue('--phone-header-h')).toContain('safe-area-inset-top');
        expect(root.style.getPropertyValue('--sticky-top')).toBe('calc(var(--phone-header-h) + 0.25rem)');
        expect(screen.getAllByRole('banner')[0].className).toContain('h-[var(--phone-header-h,auto)]');
        expect(root.style.getPropertyValue('--bottom-bar-h')).toContain('safe-area-inset-bottom');
    });

    it('on desktop there is no header or bottom bar to clear', () => {
        desktop();
        const { container } = at('/');
        expect(container.firstChild.style.getPropertyValue('--sticky-top')).toBe('0.75rem');
        expect(container.firstChild.style.getPropertyValue('--bottom-bar-h')).toBe('0px');
    });
});
