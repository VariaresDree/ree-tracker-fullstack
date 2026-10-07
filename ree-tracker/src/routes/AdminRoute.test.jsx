import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// The admin role arrives with the profile request, seconds after sign-in on a
// cold backend. A guard that only looked at isAdmin would bounce a real admin
// who opened /admin directly. It waits for the role, never bounces an offline
// admin, and sends a learner home. The server remains the real gate.
const auth = { isAdmin: false, roleResolved: false };
let online = true;
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => online }));

const { default: AdminRoute } = await import('./AdminRoute');

const renderAdmin = () => render(
    <MemoryRouter initialEntries={['/admin']}>
        <Routes>
            <Route path="/admin" element={<AdminRoute><p>admin tools</p></AdminRoute>} />
            <Route path="/" element={<p>today</p>} />
        </Routes>
    </MemoryRouter>,
);

beforeEach(() => { Object.assign(auth, { isAdmin: false, roleResolved: false }); online = true; });

describe('AdminRoute', () => {
    it('waits while the role is still loading', () => {
        renderAdmin();
        expect(screen.getByRole('status')).toHaveTextContent('Checking access');
        expect(screen.queryByText('admin tools')).toBeNull();
    });

    it('shows the tools to an admin', () => {
        Object.assign(auth, { isAdmin: true, roleResolved: true });
        renderAdmin();
        expect(screen.getByText('admin tools')).toBeInTheDocument();
    });

    it('sends a learner home', () => {
        Object.assign(auth, { roleResolved: true });
        renderAdmin();
        expect(screen.getByText('today')).toBeInTheDocument();
    });

    it('does not bounce anyone while offline — the role could not be checked', () => {
        Object.assign(auth, { roleResolved: true });
        online = false;
        renderAdmin();
        expect(screen.getByText(/need a connection/i)).toBeInTheDocument();
    });
});
