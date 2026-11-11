import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../../components/NotificationOptIn', () => ({ default: ({ inline }) => <p>reminder-offer inline={String(inline)}</p> }));

const { default: SessionSummary } = await import('./SessionSummary');
const { buildSessionSummary } = await import('./buildSessionSummary');

const summary = buildSessionSummary([
  { questionId: 'q1', subject: 'EE', subtopic: 'Protection', isCorrect: false, confidenceLevel: 'HIGH', timeSpentMs: 40000 },
  { questionId: 'q2', subject: 'EE', subtopic: 'Protection', isCorrect: true, confidenceLevel: 'LOW', timeSpentMs: 20000 },
  { questionId: 'q3', subject: 'Mathematics', subtopic: 'Calculus', isCorrect: true, confidenceLevel: 'MED', timeSpentMs: 30000 },
  { questionId: 'q4', subject: 'EE', subtopic: 'Protection', isCorrect: false, confidenceLevel: 'MED', timeSpentMs: 30000 },
], [{ id: 'q1', text: 'Relay pickup current?', answer: '5 A' }], 95);
// Twelve answers of a mixed set: big enough to compare with the pass mark.
const mixed = (source) => ({
  ...buildSessionSummary(Array.from({ length: 12 }, (_, i) => ({ questionId: `m${i}`, subject: 'EE', subtopic: 'Machines', isCorrect: i < 5, confidenceLevel: 'MED', timeSpentMs: 9000 })), [], 300),
  config: { source },
});

const renderSummary = (props = {}) => {
  const handlers = { onRetry: vi.fn(), onAgain: vi.fn(), onDrill: vi.fn(), onDone: vi.fn() };
  render(
    <MemoryRouter>
      <SessionSummary summary={summary} isOnline loading={false} {...handlers} {...props} />
    </MemoryRouter>,
  );
  return handlers;
};

describe('SessionSummary', () => {
  it('shows the score, the time and what went wrong', () => {
    renderSummary();
    expect(screen.getByRole('heading', { level: 1, name: 'Session complete' })).toBeInTheDocument();
    expect(screen.getByText('4 questions in 1m 35s.')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('2 of 4 correct')).toBeInTheDocument();
    expect(screen.getByText('1 wrong while you were sure.')).toBeInTheDocument();
    expect(screen.getByText(/1 right while unsure/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'How you did by topic' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Protection: 1 of 3 correct' })).toBeInTheDocument();
    // Two misses and one lucky guess come back as reviews.
    expect(screen.getByText('3 come back in your reviews, from tomorrow, until you know them.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Review every item' })).toBeInTheDocument();
    expect(screen.getByText('Relay pickup current?')).toBeInTheDocument();
    expect(screen.getByText('5 A')).toBeInTheDocument();
    // The reminder offer sits in the page, not over the buttons.
    expect(screen.getByText('reminder-offer inline=true')).toBeInTheDocument();
  });

  it('each next step does what it says', () => {
    const h = renderSummary();
    fireEvent.click(screen.getByRole('button', { name: /Practise again/ }));
    expect(h.onAgain).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Retry missed \(\d+\)/ }));
    expect(h.onRetry).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Drill Protection/ }));
    expect(h.onDrill).toHaveBeenCalledWith(expect.objectContaining({ topic: 'Protection', subject: 'EE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(h.onDone).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'See your progress' })).toHaveAttribute('href', '/progress?tab=topics');
  });

  it('the drill can start offline: it draws from the device', () => {
    renderSummary();
    expect(screen.getByRole('button', { name: /Drill Protection/ })).toBeEnabled();
  });

  it('offers the mistakes and the way back to Today', () => {
    renderSummary();
    expect(screen.getByRole('link', { name: 'Open mistakes' })).toHaveAttribute('href', '/library?tab=notebook');
    expect(screen.getByRole('link', { name: /^Back to Today, \d+ of \d+ answered today$/ })).toHaveAttribute('href', '/');
  });

  it('judges a mixed set of 10 or more against the pass mark, and nothing smaller', () => {
    renderSummary({ summary: mixed('library') });
    expect(screen.getByText('Below the 70% pass mark')).toBeInTheDocument();
  });

  it('a short session gets no verdict', () => {
    renderSummary();
    expect(screen.queryByText(/pass mark/)).not.toBeInTheDocument();
  });

  it.each(['srs-due', 'today-loop', 'items', 'smart-drill'])('a %s session of your misses gets no verdict', (source) => {
    renderSummary({ summary: mixed(source) });
    expect(screen.queryByText(/pass mark/)).not.toBeInTheDocument();
  });

  it('after Today’s loop, Next loop takes the place of Practise again', () => {
    const onNextLoop = vi.fn();
    const h = renderSummary({ summary: mixed('today-loop'), onNextLoop });
    expect(screen.queryByRole('button', { name: /Practise again/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Next loop/ }));
    expect(onNextLoop).toHaveBeenCalled();
    expect(h.onAgain).not.toHaveBeenCalled();
  });

  it('one miss in a topic offers no drill', () => {
    renderSummary({ summary: buildSessionSummary([
      { questionId: 'a', subject: 'EE', subtopic: 'Protection', isCorrect: false, confidenceLevel: 'MED', timeSpentMs: 9000 },
      { questionId: 'b', subject: 'EE', subtopic: 'Machines', isCorrect: true, confidenceLevel: 'MED', timeSpentMs: 9000 },
    ], [], 30) });
    expect(screen.queryByRole('button', { name: /^Drill/ })).not.toBeInTheDocument();
  });
});

describe("SessionSummary after today's loop", () => {
  it('points on to the formula cards due', () => {
    renderSummary({ summary: { ...summary, config: { source: 'today-loop', cardsDue: 3 } } });
    expect(screen.getByText('Next in today’s loop: 3 formula cards due for review.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review cards' })).toHaveAttribute('href', '/library?tab=formulas');
  });

  it('counts the cards rated in the loop, and points on only to the rest', () => {
    renderSummary({ summary: { ...summary, cardsRated: 2, config: { source: 'today-loop', cardsDue: 3 } } });
    expect(screen.getByText('2 formula cards rated. Each comes back when it’s due.')).toBeInTheDocument();
    expect(screen.getByText('1 more formula card due for review.')).toBeInTheDocument();
  });

  it('a loop of only cards shows no score', () => {
    const cardsOnly = { total: 0, correct: 0, accuracy: 0, durationSecs: 90, avgSecs: null, byTopic: [], weakest: null, confidentMisses: 0, luckyGuesses: 0, missed: [], missedCount: 0, cardsRated: 3, config: { source: 'today-loop', cardsDue: 3 } };
    renderSummary({ summary: cardsOnly });
    expect(screen.queryByText('Score')).toBeNull();
    expect(screen.queryByText(/pass mark/)).toBeNull();
    expect(screen.getByText(/^3 formula cards in/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Review cards' })).toBeNull();
  });

  it('says nothing about cards after any other session', () => {
    renderSummary({ summary: { ...summary, config: { source: 'library', cardsDue: 3 } } });
    expect(screen.queryByRole('link', { name: 'Review cards' })).toBeNull();
  });
});
