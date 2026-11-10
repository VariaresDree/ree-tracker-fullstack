// Under a missed question: "Formula cards: Machines (2)", opening Formula
// cards at that topic. One read of the card list serves every link on the
// screen, made only when a link is first wanted.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const fetchReferenceCards = vi.fn();
vi.mock('../../services/dbQueries', () => ({ fetchReferenceCards: (...a) => fetchReferenceCards(...a) }));
const { default: TopicCardsLink } = await import('./TopicCardsLink');
const { useTopicCards } = await import('./useTopicCards');

const CARDS = [
  { id: 'a', subject: 'EE', topic: { id: 't-m', name: 'Machines' } },
  { id: 'b', subject: 'EE', topic: { id: 't-m', name: 'Machines' } },
  { id: 'c', subject: 'EE', topic: { id: 't-p', name: 'Protection' } },
];

let state;
function Probe() {
  state = useLocation().state;
  return <p>at formula cards</p>;
}

beforeEach(() => {
  fetchReferenceCards.mockReset();
  fetchReferenceCards.mockResolvedValue(CARDS);
});

describe('TopicCardsLink', () => {
  it("names the topic and its card count, and opens Formula cards at it", async () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<TopicCardsLink topic="machines" subject="EE" />} />
          <Route path="/library" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
    const link = await screen.findByRole('link', { name: 'Formula cards: Machines (2)' });
    expect(link).toHaveAttribute('href', '/library?tab=formulas');
    link.click();
    await screen.findByText('at formula cards');
    expect(state).toEqual({ subject: 'EE', topic: 'Machines' });
  });

  it('shows nothing for a topic with no cards', async () => {
    const { container } = render(<MemoryRouter><TopicCardsLink topic="Optics" subject="EE" /></MemoryRouter>);
    await waitFor(() => expect(fetchReferenceCards).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('useTopicCards', () => {
  // Keeping and sharing the read is fetchReferenceCards' job (services/referenceCardsRead.test.js).
  it('reads the cards only when wanted, and gives each link its topic', async () => {
    const off = renderHook(() => useTopicCards({ topic: 'Machines', subject: 'EE' }, { enabled: false }));
    expect(off.result.current).toEqual([]);
    expect(fetchReferenceCards).not.toHaveBeenCalled();

    const one = renderHook(() => useTopicCards({ topic: 'Machines', subject: 'EE' }));
    const two = renderHook(() => useTopicCards({ topicId: 't-p' }));
    await waitFor(() => expect(two.result.current.map((c) => c.id)).toEqual(['c']));
    expect(one.result.current.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('a failed read shows no cards, and the next link asks again', async () => {
    fetchReferenceCards.mockRejectedValueOnce(new Error('500'));
    const first = renderHook(() => useTopicCards({ topic: 'Machines', subject: 'EE' }));
    await waitFor(() => expect(fetchReferenceCards).toHaveBeenCalledTimes(1));
    expect(first.result.current).toEqual([]);
    const again = renderHook(() => useTopicCards({ topic: 'Machines', subject: 'EE' }));
    await waitFor(() => expect(again.result.current).toHaveLength(2));
  });
});
