// Under a missed question: "Formula cards: Machines (2)", opening Formula
// cards at that topic. One read of the card list serves every link on the
// screen, made only when a link is first wanted.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const fetchReferenceCards = vi.fn();
vi.mock('../../services/dbQueries', () => ({ fetchReferenceCards: (...a) => fetchReferenceCards(...a) }));
const { default: TopicCardsLink } = await import('./TopicCardsLink');
const { useTopicCards, resetTopicCards } = await import('./useTopicCards');

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
  resetTopicCards();
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
  it('reads the card list once for every link, and only when wanted', async () => {
    const off = renderHook(() => useTopicCards({ topic: 'Machines', subject: 'EE' }, { enabled: false }));
    expect(off.result.current).toEqual([]);
    expect(fetchReferenceCards).not.toHaveBeenCalled();

    const one = renderHook(() => useTopicCards({ topic: 'Machines', subject: 'EE' }));
    const two = renderHook(() => useTopicCards({ topicId: 't-p' }));
    await waitFor(() => expect(two.result.current.map((c) => c.id)).toEqual(['c']));
    expect(one.result.current.map((c) => c.id)).toEqual(['a', 'b']);
    expect(fetchReferenceCards).toHaveBeenCalledTimes(1);
  });

  it("doesn't keep an empty read (offline, nothing saved yet), and coming back online drops a kept one", async () => {
    fetchReferenceCards.mockResolvedValueOnce([]);
    const offline = renderHook(() => useTopicCards({ topic: 'Machines', subject: 'EE' }));
    await waitFor(() => expect(fetchReferenceCards).toHaveBeenCalledTimes(1));
    expect(offline.result.current).toEqual([]);
    const later = renderHook(() => useTopicCards({ topic: 'Machines', subject: 'EE' }));
    await waitFor(() => expect(later.result.current).toHaveLength(2));
    expect(fetchReferenceCards).toHaveBeenCalledTimes(2);

    // Kept now; reconnecting asks again (cards approved meanwhile show).
    renderHook(() => useTopicCards({ topicId: 't-p' }));
    expect(fetchReferenceCards).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event('online'));
    renderHook(() => useTopicCards({ topicId: 't-p' }));
    await waitFor(() => expect(fetchReferenceCards).toHaveBeenCalledTimes(3));
  });

  it('asks again after a failed read, rather than remembering "no cards"', async () => {
    fetchReferenceCards.mockRejectedValueOnce(new Error('500'));
    const first = renderHook(() => useTopicCards({ topic: 'Machines', subject: 'EE' }));
    await waitFor(() => expect(fetchReferenceCards).toHaveBeenCalledTimes(1));
    expect(first.result.current).toEqual([]);
    const again = renderHook(() => useTopicCards({ topic: 'Machines', subject: 'EE' }));
    await waitFor(() => expect(again.result.current).toHaveLength(2));
    expect(fetchReferenceCards).toHaveBeenCalledTimes(2);
  });
});
