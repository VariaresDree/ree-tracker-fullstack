// Formula cards: the cards due for spaced review are offered at the top, and
// "Review now" opens study mode on exactly those, with ratings.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const CARDS = [
  { id: 'a', name: 'Ohm’s law', kind: 'formula', subject: 'EE' },
  { id: 'b', name: 'Watt', kind: 'formula', subject: 'EE' },
  { id: 'c', name: 'Coulomb', kind: 'constant', subject: 'ESAS' },
];
vi.mock('./useReferenceCards', () => ({ useReferenceCards: () => ({ cards: CARDS, loading: false, loadError: false, reload: vi.fn() }) }));
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel({ dynamicTOS: { EE: [], ESAS: [] } }) }));
let reviewItems = [];
vi.mock('./useCardReviews', async (orig) => ({
  ...(await orig()),
  useCardReviews: () => ({ items: reviewItems, status: 'ready', rowFor: () => null, rate: vi.fn(() => Promise.resolve('sent')), reload: vi.fn() }),
}));
vi.mock('./Flashcard', () => ({ default: ({ card }) => <p>card {card.name}</p> }));

const { default: ReferenceBrowser } = await import('./ReferenceBrowser');

describe('ReferenceBrowser — card reviews', () => {
  it('offers the due cards and reviews exactly those', () => {
    const past = new Date(Date.now() - 3600_000).toISOString();
    reviewItems = [
      { cardId: 'a', nextReviewDate: past },
      { cardId: 'c', nextReviewDate: past },
      { cardId: 'b', nextReviewDate: new Date(Date.now() + 5 * 86400_000).toISOString() },
    ];
    render(<ReferenceBrowser />);
    expect(screen.getByText('2 formula cards due for review')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review now' }));
    expect(screen.getByText('Review 1 / 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exit review/ })).toBeInTheDocument();
  });

  it('says when the next review is due once all are done', () => {
    reviewItems = [{ cardId: 'b', nextReviewDate: new Date(Date.now() + 5 * 86400_000).toISOString() }];
    render(<ReferenceBrowser />);
    expect(screen.queryByRole('button', { name: 'Review now' })).not.toBeInTheDocument();
    expect(screen.getByText(/Card reviews: all caught up\. Next one due/)).toBeInTheDocument();
  });
});
