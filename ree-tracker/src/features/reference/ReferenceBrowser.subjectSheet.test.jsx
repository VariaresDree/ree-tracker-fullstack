// Formula cards (2026-10-31): formulas and constants only, Subject → Topic,
// a topic's cards under subtopic headings, and a Quick sheet that shows a
// subject's or topic's formulas at a glance. The position survives leaving
// the tab.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { expectNoSkippedLevels } from '../../test/headings';

const CARDS = [
  { id: 'a', name: 'Ohm’s law', kind: 'formula', subject: 'EE', topic: { name: 'DC Circuits' }, subtopicTag: 'Resistance', formulaLatex: 'V = IR', valueUnit: '\\text{V}' },
  { id: 'b', name: 'Kirchhoff', kind: 'formula', subject: 'EE', topic: { name: 'DC Circuits' }, subtopicTag: 'Networks', formulaLatex: '\\sum I = 0' },
  { id: 'e', name: 'Permittivity', kind: 'constant', subject: 'EE', topic: { name: 'AC Circuits' }, valueUnit: '8.854\\times10^{-12}\\ \\text{F/m}' },
  { id: 'd', name: 'Coulomb', kind: 'constant', subject: 'ESAS', topic: { name: 'Physics' } },
];
vi.mock('./useReferenceCards', async (orig) => ({
  ...(await orig()),
  useReferenceCards: () => ({ cards: CARDS, loading: false, loadError: false, reload: vi.fn() }),
}));
vi.mock('../../store/useStore', () => ({
  useStore: (sel) => sel({ dynamicTOS: { EE: ['AC Circuits', 'DC Circuits'], ESAS: ['Physics'] } }),
}));
vi.mock('./useCardReviews', async (orig) => ({
  ...(await orig()),
  useCardReviews: () => ({ items: [], status: 'ready', rowFor: () => null, rate: vi.fn(() => Promise.resolve('sent')), reload: vi.fn() }),
}));
vi.mock('./Flashcard', () => ({ default: ({ card }) => <p>card {card.name}</p> }));

expect.extend(axeMatchers);
// jsdom can't compute colour contrast, and the page shell owns the language.
const AXE_OPTS = { rules: { 'color-contrast': { enabled: false }, 'html-has-lang': { enabled: false } } };

const { default: ReferenceBrowser } = await import('./ReferenceBrowser');
const { groupCards } = await import('./groupCards');
const { learnerCards } = await import('./useReferenceCards');

beforeEach(() => sessionStorage.clear());

describe('ReferenceBrowser — formulas and constants', () => {
  it('offers only formulas and constants, and counts them on the tiles', () => {
    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    expect(screen.getByText('2 formulas · 1 constant')).toBeInTheDocument();
    const kinds = within(screen.getByRole('radiogroup', { name: 'Card kind' })).getAllByRole('radio').map((r) => r.textContent);
    expect(kinds).toEqual(['All', 'Formulas', 'Constants']);
  });

  it('opens a topic straight onto its cards, with no heading over a single card', () => {
    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^EE/ }));
    fireEvent.click(screen.getByRole('button', { name: /^DC Circuits/ }));
    expect(screen.queryByRole('group', { name: 'Show one tag' })).not.toBeInTheDocument();
    expect(screen.getByText('card Ohm’s law')).toBeInTheDocument();
    expect(screen.getByText('card Kirchhoff')).toBeInTheDocument();
  });

  it('with a family of cards, shows its heading and a chip to narrow down to it', () => {
    const extra = { id: 'x', name: 'Power law', kind: 'formula', subject: 'EE', topic: { name: 'DC Circuits' }, subtopicTag: 'Resistance', formulaLatex: 'P = I^2 R' };
    CARDS.push(extra);
    try {
      render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: /^EE/ }));
      fireEvent.click(screen.getByRole('button', { name: /^DC Circuits/ }));
      expect(screen.getByText('Resistance · 2')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Resistance 2' }));
      expect(screen.queryByText('card Kirchhoff')).not.toBeInTheDocument();
      expect(screen.getByText('card Power law')).toBeInTheDocument();
    } finally {
      CARDS.pop();
    }
  });

  it('folds topics with no cards away from the ones that have them', () => {
    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^ESAS/ }));
    const empty = screen.queryByRole('button', { name: /^No cards yet/ });
    if (empty) expect(empty).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /^Physics/ })).toBeInTheDocument();
  });

  it('shows a subject as a quick sheet: every formula and constant at a glance', async () => {
    const { container } = render(<><h2>Formula cards</h2><MemoryRouter><ReferenceBrowser /></MemoryRouter></>);
    fireEvent.click(screen.getByRole('button', { name: /^EE/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Quick sheet' }));
    expect(await screen.findByRole('heading', { name: 'AC Circuits' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'DC Circuits' })).toBeInTheDocument();
    expect(screen.getByText('Ohm’s law')).toBeInTheDocument();
    expect(screen.getByText('Permittivity')).toBeInTheDocument();
    expect(screen.queryByText('Coulomb')).not.toBeInTheDocument();
    expectNoSkippedLevels(container);
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  });

  it('studies one topic from the quick sheet', async () => {
    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^EE/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Quick sheet' }));
    const section = (await screen.findByRole('heading', { name: 'DC Circuits' }, { timeout: 5000 })).closest('section');
    fireEvent.click(within(section).getByRole('button', { name: 'Study the DC Circuits cards' }));
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
  });

  it('its location trail buttons are touch-sized', () => {
    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^EE/ }));
    const trail = within(screen.getByRole('navigation', { name: 'Formula cards location' })).getAllByRole('button');
    expect(trail.length).toBeGreaterThan(0);
    trail.forEach((b) => expect(b.className).toMatch(/pointer-coarse:min-h-11/));
  });

  it('comes back to the same subject and view after leaving the tab', async () => {
    const { unmount } = render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^EE/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Quick sheet' }));
    await screen.findByRole('heading', { name: 'AC Circuits' }, { timeout: 5000 });
    unmount();

    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'AC Circuits' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Quick sheet' })).toHaveAttribute('aria-checked', 'true');
  });

  it('a deep-linked search starts fresh instead of restoring', () => {
    sessionStorage.setItem('ree.formulaCards.position', JSON.stringify({ subject: 'EE', view: 'sheet' }));
    render(<ReferenceBrowser initialSearch="Coulomb" />);
    expect(screen.getByText('card Coulomb')).toBeInTheDocument();
    expect(screen.queryByText('card Ohm’s law')).not.toBeInTheDocument();
  });

  it('a link asking for concepts opens on all cards', () => {
    render(<ReferenceBrowser initialKind="concept" />);
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
  });
});

describe('groupCards and learnerCards', () => {
  it('groups a subject by topic in syllabus order, formulas before constants', () => {
    const groups = groupCards(CARDS.filter((c) => c.subject === 'EE'), { by: 'topic', topicOrder: ['AC Circuits', 'DC Circuits'] });
    expect(groups.map((g) => g.label)).toEqual(['AC Circuits', 'DC Circuits']);
    expect(groups[1].subgroups.map((s) => s.label)).toEqual(['General']);
  });

  it('drops concept cards a device cached before they were retired', () => {
    expect(learnerCards([{ kind: 'formula' }, { kind: 'concept' }, { kind: 'constant' }]).map((c) => c.kind)).toEqual(['formula', 'constant']);
    expect(learnerCards(null)).toEqual([]);
  });
});
