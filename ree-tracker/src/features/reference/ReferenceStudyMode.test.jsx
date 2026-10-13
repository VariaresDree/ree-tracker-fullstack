// Study mode: arrow keys and Escape work at once, and spaced review — once a
// card's back has been seen, rate it (buttons or 1–4) and move on; each
// button says when the card comes back.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NEW_CARD, rateCard } from '@ree/shared';

vi.mock('./Flashcard', () => ({
  default: ({ card, onFlip }) => <button type="button" onClick={() => onFlip?.(true)}>card {card.name}</button>,
}));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
const { default: ReferenceStudyMode } = await import('./ReferenceStudyMode');
const { overlayQueuedRatings, dueCardIds } = await import('./useCardReviews');

const CARDS = [{ id: 'a', name: 'Ohm' }, { id: 'b', name: 'Watt' }];

describe('ReferenceStudyMode', () => {
  it('takes focus on open, so the arrow keys work straight away', () => {
    const onExit = vi.fn();
    render(<ReferenceStudyMode cards={CARDS} onExit={onExit} />);
    const region = screen.getByRole('region', { name: /Study mode/ });
    expect(region).toHaveFocus();
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(screen.getByText('card Watt')).toBeInTheDocument();
    fireEvent.keyDown(region, { key: 'Escape' });
    expect(onExit).toHaveBeenCalled();
  });

  it('rates a card once its back has been seen, then moves on, and says when each comes back', () => {
    const rate = vi.fn(() => Promise.resolve('sent'));
    const reviews = { rate, rowFor: () => null };
    render(<ReferenceStudyMode cards={CARDS} mode="review" reviews={reviews} onExit={vi.fn()} />);
    expect(screen.queryByRole('group', { name: 'How well did you know it?' })).not.toBeInTheDocument();
    expect(screen.getByText(/Flip the card, then rate/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'card Ohm' }));
    const good = screen.getByRole('button', { name: /Good/ });
    expect(good).toHaveTextContent('tomorrow');
    fireEvent.click(good);
    expect(rate).toHaveBeenCalledWith('a', 'good');
    expect(screen.getByText('card Watt')).toBeInTheDocument();

    // Keys 1–4 once flipped; rating the last card ends the session.
    const region = screen.getByRole('region', { name: /Study mode/ });
    fireEvent.keyDown(region, { key: '1' });
    expect(rate).toHaveBeenCalledTimes(1); // not flipped yet
    fireEvent.click(screen.getByRole('button', { name: 'card Watt' }));
    fireEvent.keyDown(region, { key: '1' });
    expect(rate).toHaveBeenLastCalledWith('b', 'again');
    expect(screen.getByText('Done: 2 cards rated')).toBeInTheDocument();
  });

  it('shows the longer interval a card has earned', () => {
    const row = rateCard(rateCard(NEW_CARD, 'good'), 'good'); // 6 days
    render(<ReferenceStudyMode cards={CARDS} reviews={{ rate: vi.fn(() => Promise.resolve()), rowFor: () => row }} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'card Ohm' }));
    expect(screen.getByRole('button', { name: /Good/ })).toHaveTextContent(/days|mo/);
    expect(screen.getByRole('button', { name: /Again/ })).toHaveTextContent('tomorrow');
  });
});

describe('card review rows', () => {
  it('replays queued ratings in order over the server copy, this account only', () => {
    const at = '2026-10-10T02:00:00.000Z';
    const writes = [
      { method: 'POST', endpoint: '/api/user/card-reviews/a', body: { rating: 'good', reviewedAt: at }, ownerUid: 'u1' },
      { method: 'POST', endpoint: '/api/user/card-reviews/a', body: { rating: 'good', reviewedAt: at }, ownerUid: 'u1' },
      { method: 'POST', endpoint: '/api/user/card-reviews/b', body: { rating: 'easy', reviewedAt: at }, ownerUid: 'u2' },
    ];
    const { value, count } = overlayQueuedRatings({ items: [] }, writes, 'u1');
    expect(count).toBe(2);
    expect(value.items).toEqual([expect.objectContaining({ cardId: 'a', interval: 6, repetitions: 2 })]);
  });

  it('lists the due cards you can see, soonest first', () => {
    const now = Date.parse('2026-10-10T00:00:00Z');
    const items = [
      { cardId: 'a', nextReviewDate: '2026-10-09T16:00:00Z' },
      { cardId: 'b', nextReviewDate: '2026-10-08T16:00:00Z' },
      { cardId: 'c', nextReviewDate: '2026-10-11T16:00:00Z' },
      { cardId: 'gone', nextReviewDate: '2026-10-01T16:00:00Z' },
    ];
    expect(dueCardIds(items, ['a', 'b', 'c'], now)).toEqual(['b', 'a']);
  });
});
