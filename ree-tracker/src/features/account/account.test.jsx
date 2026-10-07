// Account (2026-10 reorganization). One place for the exam date and daily
// target — they had three editors (Profile, the Daily targets "Config" and the
// planner) — plus the data actions that used to hide inside Daily targets, and
// password reset / change, which the app never had.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const state = {
    stats: { examDate: '2026-11-20', dailyTarget: 50 },
    saveExamConfig: vi.fn(() => Promise.resolve()),
    resetDailyQuotas: vi.fn(),
    purgeAnalytics: vi.fn(() => Promise.resolve()),
    syncQueue: [],
    pendingWrites: [],
    resetStore: vi.fn(),
};
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel(state) }));
const auth = {
    currentUser: { uid: 'u1', email: 'rey@example.com' },
    resetPassword: vi.fn(() => Promise.resolve()),
    changePassword: vi.fn(() => Promise.resolve()),
    logout: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
};
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: ExamPlanForm } = await import('./ExamPlanForm');
const { default: DataSettings } = await import('./DataSettings');
const { default: SecuritySettings } = await import('./SecuritySettings');
const { default: Login } = await import('../../pages/Login');

beforeEach(() => { vi.clearAllMocks(); });

describe('ExamPlanForm — the one editor for the exam date and daily target', () => {
    it('saves both fields', async () => {
        render(<ExamPlanForm />);
        fireEvent.change(screen.getByLabelText('Exam date'), { target: { value: '2027-04-10' } });
        fireEvent.change(screen.getByLabelText('Daily target'), { target: { value: '80' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save exam plan' }));
        await waitFor(() => expect(state.saveExamConfig).toHaveBeenCalledWith({ examDate: '2027-04-10', dailyTarget: 80 }));
        expect(toast.success).toHaveBeenCalled();
    });

    it('shows the per-subject split of the target', () => {
        render(<ExamPlanForm />);
        expect(screen.getByText(/Mathematics 12 · ESAS 15 · EE 23/)).toBeInTheDocument();
    });

    it('rejects a target outside 10–500 without saving', () => {
        render(<ExamPlanForm />);
        fireEvent.change(screen.getByLabelText('Daily target'), { target: { value: '5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save exam plan' }));
        expect(screen.getByText(/between 10 and 500/)).toBeInTheDocument();
        expect(state.saveExamConfig).not.toHaveBeenCalled();
    });

    it('says plainly when it can’t save offline', async () => {
        state.saveExamConfig.mockRejectedValueOnce(new Error('[OFFLINE]'));
        render(<ExamPlanForm />);
        fireEvent.click(screen.getByRole('button', { name: 'Save exam plan' }));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/reconnect/i)));
    });
});

describe('DataSettings — nothing destructive without a confirm', () => {
    it('reset today asks first', () => {
        render(<DataSettings />);
        fireEvent.click(screen.getByRole('button', { name: /reset today/i }));
        expect(state.resetDailyQuotas).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
        expect(state.resetDailyQuotas).toHaveBeenCalledTimes(1);
    });

    it('deleting all analytics asks first', async () => {
        render(<DataSettings />);
        fireEvent.click(screen.getByRole('button', { name: /delete all analytics/i }));
        expect(state.purgeAnalytics).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Delete analytics' }));
        await waitFor(() => expect(state.purgeAnalytics).toHaveBeenCalledTimes(1));
    });
});

describe('SecuritySettings — password', () => {
    it('emails a reset link to the signed-in address', async () => {
        render(<SecuritySettings />);
        fireEvent.click(screen.getByRole('button', { name: /send a reset email/i }));
        await waitFor(() => expect(auth.resetPassword).toHaveBeenCalledWith('rey@example.com'));
    });

    it('changes the password after checking the new one twice', async () => {
        render(<SecuritySettings />);
        fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old-pass' } });
        fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-pass-1' } });
        fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'new-pass-2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
        expect(screen.getByText(/don’t match/)).toBeInTheDocument();
        expect(auth.changePassword).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'new-pass-1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
        await waitFor(() => expect(auth.changePassword).toHaveBeenCalledWith('old-pass', 'new-pass-1'));
    });

    it('a wrong current password gets a plain message', async () => {
        auth.changePassword.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/invalid-credential' }));
        render(<SecuritySettings />);
        fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'bad' } });
        fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-pass-1' } });
        fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'new-pass-1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
        expect(await screen.findByText(/current password isn’t right/)).toBeInTheDocument();
    });
});

describe('Login — forgot password', () => {
    it('asks for the email first, then sends the reset link', async () => {
        render(<Login />);
        fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
        expect(screen.getByText(/enter your email/i)).toBeInTheDocument();
        expect(auth.resetPassword).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'rey@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
        await waitFor(() => expect(auth.resetPassword).toHaveBeenCalledWith('rey@example.com'));
    });
});
