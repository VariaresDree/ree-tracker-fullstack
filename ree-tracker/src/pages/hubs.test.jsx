// The hub pages of the 2026-10 reorganization: Exams, the learner Library and
// Admin. Their tabs live in ?tab=; heavy children are mocked so these tests
// pin the wiring, not the children.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./Arena', () => ({ default: ({ tab }) => <p>arena:{tab}</p> }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' }, isAdmin: false }) }));
vi.mock('../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
vi.mock('../features/reference/ReferenceBrowser', () => ({
    default: ({ initialSearch, initialKind }) => <p>formula-cards search={initialSearch} kind={initialKind}</p>,
}));
vi.mock('../features/materials/CloudVaultTab', () => ({ default: ({ isAdmin }) => <p>handouts admin={String(isAdmin)}</p> }));
vi.mock('../features/vault/BookmarkVaultTab', () => ({ default: () => <p>bookmarks</p> }));
vi.mock('../features/quiz-launcher/QuizLauncherTab', () => ({ default: () => <p>quizzes</p> }));
vi.mock('./admin/QuestionBank', () => ({ default: () => <p>question-bank</p> }));
vi.mock('../features/analytics/ExplanationReview', () => ({ default: () => <p>explanation-review</p> }));
vi.mock('../features/reference/ReferenceAdminV2', () => ({ default: () => <p>reference-admin</p> }));

const { default: Exams } = await import('./Exams');
const { default: Library } = await import('./Library');
const { default: Admin } = await import('./admin/Admin');

const at = (entry, Page) => render(<MemoryRouter initialEntries={[entry]}><Page /></MemoryRouter>);

describe('Exams', () => {
    it('opens on the mock board, each format linking to its setup', () => {
        at('/exams', Exams);
        expect(screen.getByRole('heading', { level: 1, name: 'Exams' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /mock board/i })).toHaveAttribute('aria-selected', 'true');
        const setups = screen.getAllByRole('link', { name: /set up/i }).map((a) => a.getAttribute('href'));
        expect(setups).toEqual([
            '/simulator?profile=custom', '/simulator?profile=prc_subject',
            '/simulator?profile=prc_blended', '/simulator?profile=prc_full',
        ]);
    });

    it.each(['gauntlet', 'battles', 'rankings'])('?tab=%s shows that section', async (tab) => {
        at(`/exams?tab=${tab}`, Exams);
        expect(await screen.findByText(`arena:${tab}`)).toBeInTheDocument();
    });
});

describe('Library (learner)', () => {
    it('opens on formula cards; an old /materials deep link keeps its search', () => {
        at({ pathname: '/library', search: '?tab=formulas', state: { search: 'Ohm', kind: 'formula' } }, Library);
        expect(screen.getByRole('heading', { level: 1, name: 'Library' })).toBeInTheDocument();
        expect(screen.getByText('formula-cards search=Ohm kind=formula')).toBeInTheDocument();
    });

    it('handouts are read-only, and there is no admin tab', () => {
        at('/library?tab=handouts', Library);
        expect(screen.getByText('handouts admin=false')).toBeInTheDocument();
        const tabs = within(screen.getByRole('tablist')).getAllByRole('tab').map((t) => t.textContent);
        expect(tabs).toEqual(['Formula cards', 'Handouts', 'Bookmarks', 'Imported quizzes']);
    });
});

describe('Admin', () => {
    it('opens on the question bank, with the other content tools as tabs', async () => {
        at('/admin', Admin);
        expect(screen.getByRole('heading', { level: 1, name: 'Admin' })).toBeInTheDocument();
        expect(await screen.findByText('question-bank')).toBeInTheDocument();
        const tabs = within(screen.getByRole('tablist')).getAllByRole('tab').map((t) => t.textContent);
        expect(tabs).toEqual(['Question bank', 'Explanation review', 'Formula cards', 'Handouts']);
    });

    it('?tab=handouts gives the editable handouts', async () => {
        at('/admin?tab=handouts', Admin);
        expect(await screen.findByText('handouts admin=true')).toBeInTheDocument();
    });
});
