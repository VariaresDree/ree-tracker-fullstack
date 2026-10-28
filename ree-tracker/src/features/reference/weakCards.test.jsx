// The weak-formula sheet and random-topic recall (CELE round): which cards
// count as weak, the draw favouring weak and due topics, the print page, and
// the recall card in Formula cards.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { rateCard, NEW_CARD } from '@ree/shared';
import { isWeakReview, pickRecallTopic, weakCards } from './weakCards';

const card = (id, subject, topic, extra = {}) => ({ id, subject, name: `Card ${id}`, topic: topic ? { name: topic } : null, ...extra });
const future = new Date(Date.now() + 9 * 86400000).toISOString();
const review = (cardId, extra = {}) => ({ cardId, easeFactor: 2.5, repetitions: 2, nextReviewDate: future, ...extra });

describe('weak cards', () => {
  it('a rating now carries itself, so the last one is known', () => {
    expect(rateCard(NEW_CARD, 'hard', new Date('2026-10-28T00:00:00Z')).lastRating).toBe('hard');
  });

  it('weak is the last rating Again or Hard; an older row falls back to its schedule', () => {
    expect(isWeakReview(review('a', { lastRating: 'again' }))).toBe(true);
    expect(isWeakReview(review('a', { lastRating: 'good', easeFactor: 1.9 }))).toBe(false);
    expect(isWeakReview(review('a', { easeFactor: 2.1 }))).toBe(true);
    expect(isWeakReview(review('a', { repetitions: 0 }))).toBe(true);
    expect(isWeakReview(review('a'))).toBe(false);
  });

  it('lists the weak cards in subject and topic order', () => {
    const cards = [card('3', 'Mathematics', 'Calculus'), card('1', 'EE', 'Machines'), card('2', 'EE', 'Illumination'), card('4', 'EE', 'Machines')];
    const items = [review('1', { lastRating: 'hard' }), review('2', { lastRating: 'again' }), review('3', { lastRating: 'easy' })];
    expect(weakCards(cards, items).map((c) => c.id)).toEqual(['2', '1']);
  });

  it('the draw favours topics with weak or due cards, and skips the last pick', () => {
    const cards = [card('a', 'EE', 'Machines'), card('b', 'EE', 'Illumination'), card('c', 'EE', 'Illumination')];
    const items = [review('b', { lastRating: 'again' }), review('c', { nextReviewDate: new Date(Date.now() - 1000).toISOString() })];
    // Machines weighs 1, Illumination 1 + 2 + 2 = 5: rolls under 1/6 land on Machines.
    expect(pickRecallTopic(cards, items, 0.1).topic).toBe('Machines');
    expect(pickRecallTopic(cards, items, 0.5).topic).toBe('Illumination');
    expect(pickRecallTopic(cards, items, 0.1, 'EE|Machines').topic).toBe('Illumination');
    expect(pickRecallTopic([card('x', 'EE', null)], [], 0.3)).toBeNull();
  });
});

let refCards = [];
let reviewItems = [];
vi.mock('./useReferenceCards', () => ({ useReferenceCards: () => ({ cards: refCards, loading: false }) }));
vi.mock('./useCardReviews', () => ({ useCardReviews: () => ({ items: reviewItems }), dueCardIds: () => [] }));
vi.mock('../../hooks/useAppearance', () => ({ useAppearance: () => {} }));
vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
const { default: PrintFormulas } = await import('../../pages/PrintFormulas');

describe('PrintFormulas', () => {
  it('prints the weak cards with their formula, variables and board tip', () => {
    refCards = [
      card('1', 'EE', 'Machines', { name: 'Synchronous speed', formulaLatex: 'N_s = 120f/P', variables: [{ symbol: 'P', meaning: 'poles' }], purposeExamTip: 'Poles, not pole pairs.' }),
      card('2', 'Mathematics', 'Calculus', { name: 'Chain rule', formulaLatex: "dy/dx" }),
    ];
    reviewItems = [review('1', { lastRating: 'again' }), review('2', { lastRating: 'good' })];
    render(<MemoryRouter><PrintFormulas /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Formulas to keep in sight' })).toBeInTheDocument();
    expect(screen.getByText(/1 card you last rated Again or Hard/)).toBeInTheDocument();
    expect(screen.getByText('N_s = 120f/P')).toBeInTheDocument();
    expect(screen.getByText(/poles/)).toBeInTheDocument();
    expect(screen.getByText('Poles, not pole pairs.')).toBeInTheDocument();
    expect(screen.queryByText('Chain rule')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print/ })).not.toBeDisabled();
  });

  it('with nothing weak yet, says how cards get here', () => {
    reviewItems = [];
    render(<MemoryRouter><PrintFormulas /></MemoryRouter>);
    expect(screen.getByText('No weak formulas to print')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print/ })).toBeDisabled();
  });
});
