// Formula cards search: results come 30 at a time. Each is a two-faced card with
// its own LaTeX, and a short query matched most of the deck at once.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const CARDS = Array.from({ length: 35 }, (_, i) => ({
  id: `p${i}`, name: `Power card ${i + 1}`, kind: 'formula', subject: 'EE', topic: { name: 'AC Circuits' }, formulaLatex: 'P = VI',
}));
vi.mock('./useReferenceCards', async (orig) => ({
  ...(await orig()),
  useReferenceCards: () => ({ cards: CARDS, loading: false, loadError: false, reload: vi.fn() }),
}));
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel({ dynamicTOS: { EE: ['AC Circuits'] } }) }));
vi.mock('./useCardReviews', async (orig) => ({
  ...(await orig()),
  useCardReviews: () => ({ items: [], status: 'ready', rowFor: () => null, rate: vi.fn(() => Promise.resolve('sent')), reload: vi.fn() }),
}));
vi.mock('./Flashcard', () => ({ default: ({ card }) => <p>card {card.name}</p> }));

const { default: ReferenceBrowser } = await import('./ReferenceBrowser');

beforeEach(() => sessionStorage.clear());

describe('ReferenceBrowser search', () => {
  it('shows the first 30 matches, then the rest on request', () => {
    render(<MemoryRouter><ReferenceBrowser initialSearch="power" /></MemoryRouter>);
    expect(screen.getAllByText(/^card Power card/)).toHaveLength(30);
    fireEvent.click(screen.getByRole('button', { name: 'Show 5 more of 5' }));
    expect(screen.getAllByText(/^card Power card/)).toHaveLength(35);
    expect(screen.queryByRole('button', { name: /^Show \d+ more/ })).not.toBeInTheDocument();
  });

  it('a new search starts over at 30', () => {
    render(<MemoryRouter><ReferenceBrowser initialSearch="power" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Show 5 more of 5' }));
    fireEvent.change(screen.getByLabelText('Search reference cards'), { target: { value: 'power card' } });
    expect(screen.getAllByText(/^card Power card/)).toHaveLength(30);
  });
});
