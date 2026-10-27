// The hub pages of the 2026-10 reorganization: Exams, the learner Library and
// Admin. Their tabs live in ?tab=; heavy children are mocked so these tests
// pin the wiring, not the children.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { expectNoSkippedLevels } from '../test/headings';

vi.mock('../features/exams/GauntletTab', () => ({ default: () => <p>exams:gauntlet</p> }));
vi.mock('../features/exams/BattlesTab', () => ({ default: () => <p>exams:battles</p> }));
vi.mock('../features/exams/RankingsTab', () => ({ default: () => <p>exams:rankings</p> }));
vi.mock('../components/MockBoardAnalytics', () => ({ default: () => <p>past-sittings</p> }));
vi.mock('../features/paper-sets/PaperSetsTab', () => ({ default: () => <section><h2>Paper sets</h2><p>exams:paper</p></section> }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' }, isAdmin: false }) }));
vi.mock('../hooks/useNetworkStatus', () => ({ useNetworkStatus: () => true }));
vi.mock('../features/reference/ReferenceBrowser', () => ({
    default: ({ initialSearch, initialKind }) => <p>formula-cards search={initialSearch} kind={initialKind}</p>,
}));
vi.mock('../features/materials/CloudVaultTab', () => ({
    default: ({ isAdmin, onViewMaterial, openMaterialId }) => (
        <div>
            <p>handouts admin={String(isAdmin)} open={String(openMaterialId)}</p>
            <button type="button" onClick={() => onViewMaterial({ id: 'm1', name: 'AC notes', type: 'pdf', url: 'x' })}>open m1</button>
        </div>
    ),
}));
vi.mock('../features/materials/MaterialViewer', () => ({ default: ({ material, onClose }) => <div><p>viewing {material.name}</p><button type="button" onClick={onClose}>close viewer</button></div> }));
vi.mock('../features/vault/BookmarkVaultTab', () => ({ default: () => <p>bookmarks</p> }));
vi.mock('../features/notebook/NotebookTab', () => ({ default: () => <section><h2>Notebook</h2><p>notebook</p></section> }));
vi.mock('../features/quiz-launcher/QuizLauncherTab', () => ({ default: () => <p>quizzes</p> }));
vi.mock('./admin/QuestionBank', () => ({ default: () => <p>question-bank</p> }));
vi.mock('../features/analytics/ExplanationReview', () => ({ default: () => <p>explanation-review</p> }));
vi.mock('../features/reference/ReferenceAdminV2', () => ({ default: () => <p>reference-admin</p> }));

const { default: Exams } = await import('./Exams');
const { default: Library } = await import('./Library');
const { default: Admin } = await import('./admin/Admin');

function UrlProbe() { const l = useLocation(); return <p data-testid="url">{l.pathname + l.search}</p>; }
const at = (entry, Page) => render(<MemoryRouter initialEntries={[entry]}><Page /><UrlProbe /></MemoryRouter>);

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

    it.each(['gauntlet', 'battles', 'rankings', 'paper'])('?tab=%s shows that section', async (tab) => {
        at(`/exams?tab=${tab}`, Exams);
        expect(await screen.findByText(`exams:${tab}`)).toBeInTheDocument();
    });

    it.each(['mock', 'gauntlet', 'battles', 'rankings', 'history', 'paper'])('?tab=%s: headings step down from the h1', async (tab) => {
        const { container } = at(`/exams?tab=${tab}`, Exams);
        if (tab !== 'mock') await screen.findByText(tab === 'history' ? 'past-sittings' : `exams:${tab}`);
        expectNoSkippedLevels(container);
    });

    it('past sittings (the mock-board ledger, from the old dashboard) is its own tab', async () => {
        at('/exams?tab=history', Exams);
        const tabs = within(screen.getByRole('tablist')).getAllByRole('tab').map((t) => t.textContent);
        expect(tabs).toEqual(['Mock board', 'Gauntlet', 'Battles', 'Rankings', 'Past sittings', 'Paper sets']);
        expect(await screen.findByText('past-sittings')).toBeInTheDocument();
    });

    it('paper sets (printed mock boards, their scanned sheets and results) is its own tab', async () => {
        at('/exams?tab=paper', Exams);
        expect(screen.getByRole('tab', { name: /paper sets/i })).toHaveAttribute('aria-selected', 'true');
        expect(await screen.findByText('exams:paper')).toBeInTheDocument();
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
        expect(screen.getByText(/handouts admin=false/)).toBeInTheDocument();
        const tabs = within(screen.getByRole('tablist')).getAllByRole('tab').map((t) => t.textContent);
        expect(tabs).toEqual(['Formula cards', 'Handouts', 'Bookmarks', 'Notebook', 'Imported quizzes']);
    });
});

describe('Library headings', () => {
    // Each tab's own panel is mocked here; the real Notebook, Bookmarks and
    // formula-card panels check their outlines in their own tests.
    it.each(['formulas', 'handouts', 'bookmarks', 'notebook', 'quizzes'])('?tab=%s: headings step down from the h1', async (tab) => {
        const { container } = at(`/library?tab=${tab}`, Library);
        if (tab === 'quizzes') await screen.findByText('quizzes');
        expectNoSkippedLevels(container);
    });
});

describe('Library handout viewer', () => {
    it('an open handout is in the URL, and closing it goes back to the list', () => {
        at('/library?tab=handouts', Library);
        fireEvent.click(screen.getByRole('button', { name: 'open m1' }));
        expect(screen.getByText('viewing AC notes')).toBeInTheDocument();
        expect(screen.getByTestId('url')).toHaveTextContent('material=m1');
        fireEvent.click(screen.getByRole('button', { name: 'close viewer' }));
        expect(screen.getByText(/handouts admin=false/)).toBeInTheDocument();
        expect(screen.getByTestId('url')).not.toHaveTextContent('material=');
    });

    it('a link with ?material= asks the handouts list to open it', () => {
        at('/library?tab=handouts&material=m7', Library);
        expect(screen.getByText('handouts admin=false open=m7')).toBeInTheDocument();
    });
});

describe('Admin', () => {
    it('opens on the question bank, with the other content tools as tabs', async () => {
        at('/admin', Admin);
        expect(screen.getByRole('heading', { level: 1, name: 'Admin' })).toBeInTheDocument();
        expect(await screen.findByText('question-bank')).toBeInTheDocument();
        const tabs = within(screen.getByRole('tablist')).getAllByRole('tab').map((t) => t.textContent);
        expect(tabs).toEqual(['Question bank', 'Explanation review', 'Formula cards', 'Handouts', 'AI models']);
    });

    it('?tab=handouts gives the editable handouts', async () => {
        at('/admin?tab=handouts', Admin);
        expect(await screen.findByText(/handouts admin=true/)).toBeInTheDocument();
    });
});
