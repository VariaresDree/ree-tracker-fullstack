// Formula cards under the syllabus subtopics (2026-11-16): a heading per
// subtopic in syllabus order, the cards' own tags as smaller groups inside,
// cards not filed yet last, and "On this page" jumps to each.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { expectNoSkippedLevels } from '../../test/headings';

const sub = (id, name, sortOrder) => ({ id, name, sortOrder });
const EXPR = sub('s-expr', 'Algebraic Expressions', 0);
const BIN = sub('s-bin', 'Binomial Theorem', 3);
const card = (id, name, subtopic, subtopicTag) => ({ id, name, kind: 'formula', subject: 'Mathematics', topic: { name: 'Algebra' }, subtopic, subtopicTag, formulaLatex: 'x' });
const CARDS = [
  card('a', 'Product of Powers', EXPR, 'Laws of exponents'),
  card('b', 'Power of a Power', EXPR, 'Laws of exponents'),
  card('c', 'Product of Roots', EXPR, 'Laws of radicals'),
  card('d', 'Quotient of Roots', EXPR, 'Laws of radicals'),
  card('e', 'General Term', BIN, null),
  card('f', 'Golden Ratio', null, 'Mathematical Constants'),
];
vi.mock('./useReferenceCards', async (orig) => ({
  ...(await orig()),
  useReferenceCards: () => ({ cards: CARDS, loading: false, loadError: false, reload: vi.fn() }),
}));
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel({ dynamicTOS: { Mathematics: ['Algebra'] } }) }));
vi.mock('./useCardReviews', async (orig) => ({
  ...(await orig()),
  useCardReviews: () => ({ items: [], status: 'ready', rowFor: () => null, rate: vi.fn(() => Promise.resolve('sent')), reload: vi.fn() }),
}));
vi.mock('./Flashcard', () => ({ default: ({ card: c }) => <p>card {c.name}</p> }));

expect.extend(axeMatchers);
const AXE_OPTS = { rules: { 'color-contrast': { enabled: false }, 'html-has-lang': { enabled: false } } };

const { default: ReferenceBrowser } = await import('./ReferenceBrowser');
const { groupCards } = await import('./groupCards');

beforeEach(() => sessionStorage.clear());

describe('groupCards by syllabus subtopic', () => {
  it('sections in syllabus order, tags inside, unfiled cards last', () => {
    const groups = groupCards([...CARDS].reverse(), { by: 'subtopic' });
    expect(groups.map((g) => [g.label, g.cards.length])).toEqual([['Algebraic Expressions', 4], ['Binomial Theorem', 1], ['Other cards', 1]]);
    expect(groups[0].subgroups.map((s) => s.label)).toEqual(['Laws of exponents', 'Laws of radicals']);
    expect(groups[0].id).toBe('s-expr');
  });

  it('keeps tag groups for a topic none of whose cards has a subtopic yet', () => {
    const groups = groupCards(CARDS.map((c) => ({ ...c, subtopic: null })), { by: 'subtopic' });
    expect(groups.every((g) => !g.id)).toBe(true);
  });
});

describe('a topic under its syllabus subtopics', () => {
  const open = async () => {
    // As in the Library: its h1, then the tab's h2.
    const view = render(<MemoryRouter><h1>Library</h1><h2>Formula cards</h2><ReferenceBrowser /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^Mathematics/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Algebra/ }));
    await screen.findAllByRole('heading', { level: 3 }, { timeout: 5000 });
    return view;
  };

  it('a panel per subtopic in syllabus order, with the smaller groups inside', async () => {
    await open();
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Algebraic Expressions 4', 'Binomial Theorem 1', 'Other cards 1']);
    const expr = screen.getByRole('region', { name: /Algebraic Expressions/ });
    expect(within(expr).getByText('Laws of exponents · 2')).toBeInTheDocument();
    expect(within(expr).getByText('Product of Roots')).toBeInTheDocument();
    // One card under Binomial Theorem: no group label over it.
    expect(within(screen.getByRole('region', { name: /Binomial Theorem/ })).queryByText(/·/)).toBeNull();
  });

  it('"On this page" jumps to each panel', async () => {
    await open();
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#cards-s-expr', '#cards-s-bin', '#cards-other']);
    expect(document.getElementById('cards-s-bin')).not.toBeNull();
  });

  it('reads well: no skipped heading levels, no axe violations', async () => {
    const { container } = await open();
    expectNoSkippedLevels(container);
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  });
});
