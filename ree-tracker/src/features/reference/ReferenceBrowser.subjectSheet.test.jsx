// Formula cards (2026-10-31): formulas and constants only, Subject → Topic.
// Since 2026-11-19 a topic is its formula sheet: a panel per subtopic (or, before
// its cards carry one, per family of cards), a row per formula. The position
// survives leaving the tab.
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

  const openTopic = async () => {
    const view = render(<><h2>Formula cards</h2><MemoryRouter><ReferenceBrowser /></MemoryRouter></>);
    fireEvent.click(screen.getByRole('button', { name: /^EE/ }));
    fireEvent.click(screen.getByRole('button', { name: /^DC Circuits/ }));
    await screen.findByText('Ohm’s law', {}, { timeout: 5000 });
    return view;
  };
  // A second card in the Resistance family, so it gets a panel of its own.
  const withFamily = async (fn) => {
    CARDS.push({ id: 'x', name: 'Power law', kind: 'formula', subject: 'EE', topic: { name: 'DC Circuits' }, subtopicTag: 'Resistance', formulaLatex: 'P = I^2 R' });
    try { await fn(); } finally { CARDS.pop(); }
  };

  it('opens a topic straight onto its formulas, with no heading over a single family', async () => {
    await openTopic();
    expect(screen.getByText('Kirchhoff')).toBeInTheDocument();
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    expect(screen.queryByRole('radio', { name: 'Quick sheet' })).not.toBeInTheDocument();
  });

  it('with a family of cards, gives it a panel of its own', () => withFamily(async () => {
    await openTopic();
    const family = screen.getByRole('region', { name: 'Resistance 2' });
    expect(within(family).getByText('Power law')).toBeInTheDocument();
    expect(within(family).queryByText('Kirchhoff')).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'General 1' })).getByText('Kirchhoff')).toBeInTheDocument();
  }));

  it('a topic’s sheet reads well: no skipped heading levels, no axe violations', () => withFamily(async () => {
    const { container } = await openTopic();
    expectNoSkippedLevels(container);
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }));

  it('folds topics with no cards away from the ones that have them', () => {
    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^ESAS/ }));
    const empty = screen.queryByRole('button', { name: /^No cards yet/ });
    if (empty) expect(empty).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /^Physics/ })).toBeInTheDocument();
  });

  it('a subject offers studying all its cards and printing its sheet', () => {
    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^EE/ }));
    expect(screen.getByRole('button', { name: /Study all 3/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Print the EE sheet/ })).toHaveAttribute('href', '/print/formulas?subject=EE');
  });

  // By its label: naming every button in the panel trips jsdom on KaTeX's MathML.
  it('studies one panel of a topic', () => withFamily(async () => {
    await openTopic();
    fireEvent.click(within(screen.getByRole('region', { name: 'Resistance 2' })).getByLabelText('Study the Resistance cards'));
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
  }));

  it('its location trail buttons are touch-sized', () => {
    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^EE/ }));
    const trail = within(screen.getByRole('navigation', { name: 'Formula cards location' })).getAllByRole('button');
    expect(trail.length).toBeGreaterThan(0);
    trail.forEach((b) => expect(b.className).toMatch(/pointer-coarse:min-h-11/));
  });

  it('comes back to the same topic after leaving the tab', async () => {
    const { unmount } = await openTopic();
    unmount();

    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    expect(await screen.findByText('Ohm’s law', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Formula cards location' })).getByText('DC Circuits')).toBeInTheDocument();
  });

  it('a deep-linked search starts fresh instead of restoring', async () => {
    sessionStorage.setItem('ree.formulaCards.position', JSON.stringify({ subject: 'EE', topic: 'DC Circuits' }));
    render(<ReferenceBrowser initialSearch="Coulomb" />);
    expect(await screen.findByText('Coulomb', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByText('Ohm’s law')).not.toBeInTheDocument();
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
