// Account: jump links to each section, and the exam plan form isn't wiped by
// stats arriving while it's being edited.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';

const auth = { currentUser: { uid: 'u1', email: 'rey@example.com', displayName: 'Rey' }, isAdmin: false, updateDisplayName: vi.fn() };
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));
let storeState = { stats: null, theme: 'dark', setTheme: vi.fn() };
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
});
