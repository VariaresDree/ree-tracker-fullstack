import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import LegacyRedirect from './LegacyRedirect';
import { materialsTarget } from './legacyRoutes';

// Old URLs keep working. A plain <Navigate> drops router state, and every
// "start a session" deep link (Today, Progress, the placement result) travels
// as state — so a redirect that forgot it would land on Practice without
// starting anything. Native reminders already scheduled on phones still open
// /review, so that redirect is permanent.
function Probe() {
    const loc = useLocation();
    return <pre data-testid="where">{JSON.stringify({ path: loc.pathname + loc.search, state: loc.state })}</pre>;
}

const at = (entry) => render(
    <MemoryRouter initialEntries={[entry]}>
        <Routes>
            <Route path="/review" element={<LegacyRedirect to="/practice" />} />
            <Route path="/arena" element={<LegacyRedirect to="/exams?tab=battles" />} />
            <Route path="/profile" element={<LegacyRedirect to="/account" />} />
            <Route path="/materials" element={<LegacyRedirect to={(loc) => materialsTarget(loc.state)} />} />
            <Route path="*" element={<Probe />} />
        </Routes>
    </MemoryRouter>,
);
const where = () => JSON.parse(screen.getByTestId('where').textContent);

describe('legacy redirects', () => {
    it('/review → /practice keeps the session preset', () => {
        const preset = { source: 'srs-due', count: 20 };
        at({ pathname: '/review', state: { preset } });
        expect(where()).toEqual({ path: '/practice', state: { preset } });
    });

    it('/arena → the battles tab of Exams; /profile → /account', () => {
        at('/arena');
        expect(where().path).toBe('/exams?tab=battles');
    });

    it('/profile → /account', () => {
        at('/profile');
        expect(where().path).toBe('/account');
    });

    it('/materials maps its old tab into the learner Library, keeping the search', () => {
        at({ pathname: '/materials', state: { tab: 'reference', search: 'Ohm', kind: 'formula' } });
        expect(where()).toEqual({ path: '/library?tab=formulas', state: { tab: 'reference', search: 'Ohm', kind: 'formula' } });
    });

    it('materialsTarget covers every old tab', () => {
        expect(materialsTarget({ tab: 'cloud_vault' })).toBe('/library?tab=handouts');
        expect(materialsTarget({ tab: 'bookmarks' })).toBe('/library?tab=bookmarks');
        expect(materialsTarget({ tab: 'quiz_launcher' })).toBe('/library?tab=quizzes');
        expect(materialsTarget({ tab: 'manage_ref' })).toBe('/admin?tab=references');
        expect(materialsTarget(null)).toBe('/library');
    });
});
