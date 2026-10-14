// Study mode: arrow keys and Escape work at once, and spaced review — once a
// card's back has been seen, rate it (buttons or 1–4) and move on; each
// button says when the card comes back.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { NEW_CARD, rateCard } from '@ree/shared';

vi.mock('./Flashcard', () => ({
  default: ({ card, onFlip }) => <button type="button" onClick={() => onFlip?.(true)}>card {card.name}</button>,
}));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
const questionsForTopics = vi.fn();
vi.mock('./practiseTopics', async (orig) => ({ ...(await orig()), questionsForTopics: (...a) => questionsForTopics(...a) }));
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

  it('ends a review by offering two questions on each topic rated, as a Practice set', async () => {
    const topical = [
      { id: 'a', name: 'Slip', subject: 'EE', topic: { id: 't-m', name: 'Machines' } },
      { id: 'b', name: 'Fault MVA', subject: 'EE', topic: { id: 't-p', name: 'Protection' } },
    ];
    questionsForTopics.mockResolvedValue([{ id: 'q1', text: 'Q1', answer: 'A' }]);
    let practice;
    function PracticeProbe() {
      practice = useLocation().state;
      return <p>practice</p>;
    }
    const reviews = { rate: vi.fn(() => Promise.resolve('sent')), rowFor: () => null };
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<ReferenceStudyMode cards={topical} mode="review" reviews={reviews} onExit={vi.fn()} />} />
          <Route path="/practice" element={<PracticeProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    for (const name of ['Slip', 'Fault MVA']) {
      fireEvent.click(screen.getByRole('button', { name: `card ${name}` }));
      fireEvent.click(screen.getByRole('button', { name: /Good/ }));
    }
    expect(screen.getByText('2 questions on each: Machines, Protection.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Practise these topics/ }));
    await screen.findByText('practice');
    expect(questionsForTopics).toHaveBeenCalledWith([{ subject: 'EE', topic: 'Machines' }, { subject: 'EE', topic: 'Protection' }]);
    expect(practice.preset).toMatchObject({ source: 'items', items: [{ id: 'q1' }] });
  });

  it('stays put when the learner leaves before the questions are drawn', async () => {
    let finish;
    questionsForTopics.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const onExit = vi.fn();
    let path;
    function PathProbe() { path = useLocation().pathname; return null; }
    const reviews = { rate: vi.fn(() => Promise.resolve('sent')), rowFor: () => null };
    const view = render(
      <MemoryRouter>
        <ReferenceStudyMode cards={[{ id: 'a', name: 'Slip', subject: 'EE', topic: { id: 't-m', name: 'Machines' } }]} mode="review" reviews={reviews} onExit={onExit} />
        <PathProbe />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'card Slip' }));
    fireEvent.click(screen.getByRole('button', { name: /Good/ }));
    fireEvent.click(screen.getByRole('button', { name: /Practise these topics/ }));
    // Back to the cards, then the draw finishes.
    view.rerender(<MemoryRouter><PathProbe /></MemoryRouter>);
    await act(async () => {
      finish([{ id: 'q1', text: 'Q1', answer: 'A' }]);
      await new Promise((r) => { setTimeout(r, 20); });
    });
    expect(path).toBe('/');
  });
});
