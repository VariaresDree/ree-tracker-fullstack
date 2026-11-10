// Account: jump links to each section, and the exam plan form isn't wiped by
// stats arriving while it's being edited.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';

const auth = { currentUser: { uid: 'u1', email: 'rey@example.com', displayName: 'Rey' }, isAdmin: false, updateDisplayName: vi.fn() };
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));
const saveExamConfig = vi.fn(() => Promise.resolve({ queued: false }));
let storeState = { stats: null, theme: 'dark', setTheme: vi.fn(), saveExamConfig };
const listeners = new Set();
vi.mock('../store/useStore', async () => {
  const { useSyncExternalStore } = await import('react');
  const useStore = (sel) => sel(useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => storeState));
  return { useStore };
});
vi.mock('../services/analyticsSync', () => ({ syncDashboardStats: vi.fn(() => Promise.resolve()) }));
vi.mock('../services/dbQueries', () => ({ updateUserProfile: vi.fn() }));
vi.mock('../features/profile/ThemingArchitecture', () => ({ default: () => null }));
vi.mock('../features/profile/CredentialsTab', () => ({ default: () => null }));
vi.mock('../features/account/NotificationSettings', () => ({ default: () => null }));
vi.mock('../features/account/OfflineSyncSettings', () => ({ default: () => null }));
vi.mock('../features/account/Milestones', () => ({ default: () => null }));
vi.mock('../features/account/DataSettings', () => ({ default: () => null }));
vi.mock('../features/account/SecuritySettings', () => ({ default: () => null }));
vi.mock('../features/account/ExamPlanForm', () => ({
  default: function PlanStub({ onDirtyChange }) {
    const [v, setV] = useState('');
    return <input aria-label="plan" value={v} onChange={(e) => { setV(e.target.value); onDirtyChange(true); }} />;
  },
}));

const { default: Account } = await import('./Account');

const setStats = (stats) => act(() => { storeState = { ...storeState, stats }; listeners.forEach((l) => l()); });

describe('Account', () => {
  it('its jump links stay in view, in one row', () => {
    render(<MemoryRouter><Account /></MemoryRouter>);
    const nav = screen.getByRole('navigation', { name: 'Account sections' });
    expect(nav.className).toMatch(/sticky/);
    const strip = nav.firstElementChild;
    expect(strip.className).toMatch(/overflow-x-auto/);
    expect(strip.className).not.toMatch(/flex-wrap/);
  });

  it('its jump links can be dragged with a mouse', () => {
    render(<MemoryRouter><Account /></MemoryRouter>);
    const strip = screen.getByRole('navigation', { name: 'Account sections' }).firstElementChild;
    Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: 900 });
    Object.defineProperty(strip, 'clientWidth', { configurable: true, value: 300 });
    fireEvent.pointerDown(screen.getByRole('link', { name: 'Exam plan' }), { pointerType: 'mouse', button: 0, clientX: 200 });
    act(() => { window.dispatchEvent(new MouseEvent('pointermove', { clientX: 120 })); });
    expect(strip.scrollLeft).toBe(80);
    act(() => { window.dispatchEvent(new MouseEvent('pointerup')); });
  });

  it('has jump links to its sections', () => {
    render(<MemoryRouter><Account /></MemoryRouter>);
    const nav = screen.getByRole('navigation', { name: 'Account sections' });
    expect(nav).toHaveTextContent('Sign-in & security');
    expect(screen.getByRole('link', { name: 'Exam plan' })).toHaveAttribute('href', '/#exam-plan');
  });

  it('stats arriving mid-edit don’t wipe the exam plan form', () => {
    render(<MemoryRouter><Account /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('plan'), { target: { value: '75' } });
    setStats({ examDate: '2027-04-01', dailyTarget: 60 });
    expect(screen.getByLabelText('plan')).toHaveValue('75');
  });

  it('brings Getting started back once it was skipped, on the account and this device', async () => {
    setStats(null);
    const { unmount } = render(<MemoryRouter><Account /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Show Getting started again' })).not.toBeInTheDocument();
    unmount();

    localStorage.setItem('ree_tour_seen:u1', '1');
    setStats({ tourDoneAt: '2026-11-11T00:00:00.000Z' });
    render(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route path="/account" element={<Account />} />
          <Route path="/" element={<p>today-page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show Getting started again' }));
    expect(await screen.findByText('today-page')).toBeInTheDocument();
    expect(saveExamConfig).toHaveBeenCalledWith({ tourDone: false });
    await waitFor(() => expect(localStorage.getItem('ree_tour_seen:u1')).toBeNull());
  });
});
