// Formula cards › Random topic and Print weak formulas (CELE round): a topic
// drawn in the click, its cards one tap away, another draw that skips it, and
// the print link only once something is weak.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const CARDS = [
  { id: 'a', name: 'Synchronous speed', kind: 'formula', subject: 'EE', topic: { name: 'Machines' } },
  { id: 'b', name: 'Slip', kind: 'formula', subject: 'EE', topic: { name: 'Machines' } },
  { id: 'c', name: 'Lumen', kind: 'constant', subject: 'EE', topic: { name: 'Illumination' } },
];
vi.mock('./useReferenceCards', () => ({ useReferenceCards: () => ({ cards: CARDS, loading: false, loadError: false, reload: vi.fn() }) }));
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel({ dynamicTOS: { EE: [] } }) }));
let reviewItems = [];
vi.mock('./useCardReviews', async (orig) => ({
  ...(await orig()),
  useCardReviews: () => ({ items: reviewItems, status: 'ready', rowFor: () => null, rate: vi.fn(() => Promise.resolve('sent')), reload: vi.fn() }),
}));
vi.mock('./Flashcard', () => ({ default: ({ card }) => <p>card {card.name}</p> }));

const { default: ReferenceBrowser } = await import('./ReferenceBrowser');
const later = new Date(Date.now() + 5 * 86400_000).toISOString();

afterEach(() => vi.restoreAllMocks());

describe('ReferenceBrowser — random topic and the weak-formula sheet', () => {
  it('draws a topic, opens its cards, and another draw skips it', () => {
    reviewItems = [];
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Random topic/ }));
    expect(screen.getByText('Recall every formula for: Machines')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Another topic' }));
    expect(screen.getByText('Recall every formula for: Illumination')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check with the cards' }));
    expect(screen.getByText('card Lumen')).toBeInTheDocument();
  });

  it('offers the print sheet only once a card is rated Again or Hard', () => {
    reviewItems = [{ cardId: 'a', nextReviewDate: later, easeFactor: 2.5, repetitions: 1, lastRating: 'good' }];
    const { unmount } = render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Print weak formulas/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Rate cards in a review to print/)).toBeInTheDocument();
    unmount();
    reviewItems = [{ cardId: 'a', nextReviewDate: later, easeFactor: 2.36, repetitions: 1, lastRating: 'hard' }];
    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Print weak formulas \(1\)/ })).toHaveAttribute('href', '/print/formulas');
  });
});
