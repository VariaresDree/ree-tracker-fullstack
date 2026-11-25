// Formula cards › Random topic and Print weak formulas (CELE round), both in the
// drill's setup since 2026-11-19: a topic drawn in the click, another opening that
// skips it, and the print link only once something is weak.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const CARDS = [
  { id: 'a', name: 'Synchronous speed', kind: 'formula', subject: 'EE', topic: { name: 'Machines' } },
  { id: 'b', name: 'Slip', kind: 'formula', subject: 'EE', topic: { name: 'Machines' } },
  { id: 'c', name: 'Lumen', kind: 'constant', subject: 'EE', topic: { name: 'Illumination' }, valueUnit: '683 lm/W' },
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
const openDrill = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Drill/ }));
  return screen.findByRole('dialog');
};

afterEach(() => vi.restoreAllMocks());

describe('ReferenceBrowser — random topic and the weak-formula sheet', () => {
  it('draws a topic when the drill opens, another next time, and drills its cards', async () => {
    reviewItems = [];
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    await openDrill();
    expect(screen.getByRole('radio', { name: /Random topic/ })).toHaveTextContent('Machines · 2');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await openDrill();
    fireEvent.click(screen.getByRole('radio', { name: /Random topic/ }));
    expect(screen.getByRole('radio', { name: /Random topic/ })).toHaveTextContent('Illumination · 1');
    fireEvent.click(screen.getByRole('button', { name: 'Start drill' }));
    expect(await screen.findByText('card Lumen')).toBeInTheDocument();
  });

  it('offers the weak cards and their print sheet only once a card is rated Again or Hard', async () => {
    reviewItems = [{ cardId: 'a', nextReviewDate: later, easeFactor: 2.5, repetitions: 1, lastRating: 'good' }];
    const { unmount } = render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    await openDrill();
    expect(screen.queryByRole('radio', { name: /Weak/ })).not.toBeInTheDocument();
    unmount();

    reviewItems = [{ cardId: 'a', nextReviewDate: later, easeFactor: 2.36, repetitions: 1, lastRating: 'hard' }];
    render(<MemoryRouter><ReferenceBrowser /></MemoryRouter>);
    await openDrill();
    expect(screen.queryByRole('link', { name: /Print these/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Weak/ }));
    expect(screen.getByRole('link', { name: /Print these 1/ })).toHaveAttribute('href', '/print/formulas');
  });
});
