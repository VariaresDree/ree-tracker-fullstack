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
], [{ id: 'q1', text: 'Relay pickup current?', answer: '5 A' }], 95);

const renderSummary = (props = {}) => {
  const handlers = { onAgain: vi.fn(), onDrill: vi.fn(), onDone: vi.fn() };
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
    expect(screen.getByText('3 questions in 1m 35s.')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('67% correct')).toBeInTheDocument();
    expect(screen.getByText('1 wrong while you were sure.')).toBeInTheDocument();
    expect(screen.getByText(/1 right while unsure/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'How you did by topic' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Protection: 1 of 2 correct' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Questions you missed' })).toBeInTheDocument();
    expect(screen.getByText('Relay pickup current?')).toBeInTheDocument();
    expect(screen.getByText('5 A')).toBeInTheDocument();
    // The reminder offer sits in the page, not over the buttons.
    expect(screen.getByText('reminder-offer inline=true')).toBeInTheDocument();
  });

  it('each next step does what it says', () => {
    const h = renderSummary();
    fireEvent.click(screen.getByRole('button', { name: /Practise again/ }));
    expect(h.onAgain).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Drill Protection/ }));
    expect(h.onDrill).toHaveBeenCalledWith(expect.objectContaining({ topic: 'Protection', subject: 'EE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(h.onDone).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'See your progress' })).toHaveAttribute('href', '/progress?tab=topics');
  });

  it('offline, the drill (which needs the server) is disabled', () => {
    renderSummary({ isOnline: false });
    expect(screen.getByRole('button', { name: /Drill Protection/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Practise again/ })).toBeEnabled();
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
