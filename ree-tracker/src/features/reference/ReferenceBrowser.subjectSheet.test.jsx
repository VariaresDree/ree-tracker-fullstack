// Formula cards › a subject's "All cards" view: every card in the subject on
// one page under topic and subtopic headings, Fronts/Backs for all of them,
// study a topic or the lot, and the position survives leaving the tab.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const CARDS = [
  { id: 'a', name: 'Ohm’s law', kind: 'formula', subject: 'EE', topic: { name: 'DC Circuits' }, subtopicTag: 'Resistance' },
  { id: 'b', name: 'Kirchhoff', kind: 'formula', subject: 'EE', topic: { name: 'DC Circuits' }, subtopicTag: 'Networks' },
  { id: 'c', name: 'Power factor', kind: 'concept', subject: 'EE', topic: { name: 'AC Circuits' } },
  { id: 'd', name: 'Coulomb', kind: 'constant', subject: 'ESAS', topic: { name: 'Physics' } },
];
vi.mock('./useReferenceCards', () => ({ useReferenceCards: () => ({ cards: CARDS, loading: false, loadError: false, reload: vi.fn() }) }));
vi.mock('../../store/useStore', () => ({
  useStore: (sel) => sel({ dynamicTOS: { EE: ['AC Circuits', 'DC Circuits'], ESAS: ['Physics'] } }),
}));
vi.mock('./useCardReviews', async (orig) => ({
  ...(await orig()),
  useCardReviews: () => ({ items: [], status: 'ready', rowFor: () => null, rate: vi.fn(() => Promise.resolve('sent')), reload: vi.fn() }),
}));
vi.mock('./Flashcard', () => ({
  default: ({ card, initialFlipped }) => <p>card {card.name}{initialFlipped ? ' (back)' : ''}</p>,
}));

const { default: ReferenceBrowser } = await import('./ReferenceBrowser');
const { groupCards } = await import('./groupCards');

beforeEach(() => sessionStorage.clear());

describe('groupCards', () => {
  it('orders topics as the syllabus does, subtopics A–Z with General last', () => {
    const groups = groupCards(CARDS.filter((c) => c.subject === 'EE'), { by: 'topic', topicOrder: ['AC Circuits', 'DC Circuits'] });
    expect(groups.map((g) => g.label)).toEqual(['AC Circuits', 'DC Circuits']);
    expect(groups[1].subgroups.map((s) => s.label)).toEqual(['Networks', 'Resistance']);
    expect(groups[0].subgroups.map((s) => s.label)).toEqual(['General']);
  });
});

describe('ReferenceBrowser — all cards in a subject', () => {
  it('shows a breakdown on the subject tile and every card of the subject on one page', async () => {
    render(<ReferenceBrowser />);
    expect(screen.getByText('2 formulas · 1 concept')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^EE/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'All cards' }));

    expect(await screen.findByRole('heading', { name: 'AC Circuits' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'DC Circuits' })).toBeInTheDocument();
    expect(screen.getByText('Resistance · 1')).toBeInTheDocument();
    expect(screen.getByText('card Ohm’s law')).toBeInTheDocument();
    expect(screen.getByText('card Power factor')).toBeInTheDocument();
    expect(screen.queryByText('card Coulomb')).not.toBeInTheDocument();

    // Backs flips every card at once.
    fireEvent.click(screen.getByRole('radio', { name: 'Backs' }));
    expect(screen.getByText('card Kirchhoff (back)')).toBeInTheDocument();

    // A topic folds away.
    fireEvent.click(screen.getByRole('button', { name: 'DC Circuits', expanded: true }));
    expect(screen.queryByText(/card Kirchhoff/)).not.toBeInTheDocument();
  });

  it('studies one topic from the sheet', async () => {
    render(<ReferenceBrowser />);
    fireEvent.click(screen.getByRole('button', { name: /^EE/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'All cards' }));
    const section = (await screen.findByRole('heading', { name: 'DC Circuits' })).closest('section');
    fireEvent.click(within(section).getByRole('button', { name: 'Study the DC Circuits cards' }));
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
  });

  it('comes back to the same subject and view after leaving the tab', async () => {
    const { unmount } = render(<ReferenceBrowser />);
    fireEvent.click(screen.getByRole('button', { name: /^EE/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'All cards' }));
    await screen.findByRole('heading', { name: 'AC Circuits' });
    unmount();

    render(<ReferenceBrowser />);
    expect(await screen.findByRole('heading', { name: 'AC Circuits' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'All cards' })).toHaveAttribute('aria-checked', 'true');
  });

  it('a deep-linked search starts fresh instead of restoring', () => {
    sessionStorage.setItem('ree.formulaCards.position', JSON.stringify({ subject: 'EE', view: 'all' }));
    render(<ReferenceBrowser initialSearch="Coulomb" />);
    expect(screen.getByText('card Coulomb')).toBeInTheDocument();
    expect(screen.queryByText('card Ohm’s law')).not.toBeInTheDocument();
  });
});
