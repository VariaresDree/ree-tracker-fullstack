// Another screen can open Formula cards at a topic (a missed question's
// cards, a time sink's prescription), not just start a search for its name.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const CARDS = [
  { id: 'a', name: 'Slip', kind: 'formula', subject: 'EE', topic: { id: 't-m', name: 'Machines' } },
  { id: 'b', name: 'Torque', kind: 'formula', subject: 'EE', topic: { id: 't-m', name: 'Machines' } },
  { id: 'c', name: 'Fault MVA', kind: 'formula', subject: 'EE', topic: { id: 't-p', name: 'Protection' } },
];
vi.mock('./useReferenceCards', () => ({ useReferenceCards: () => ({ cards: CARDS, loading: false, loadError: false, reload: vi.fn() }) }));
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel({ dynamicTOS: { EE: ['Machines', 'Protection'] } }) }));
vi.mock('./useCardReviews', async (orig) => ({
  ...(await orig()),
  useCardReviews: () => ({ items: [], status: 'ready', rowFor: () => null, rate: vi.fn(), reload: vi.fn() }),
}));
vi.mock('./Flashcard', () => ({ default: ({ card }) => <p>card {card.name}</p> }));

const { default: ReferenceBrowser } = await import('./ReferenceBrowser');

describe('ReferenceBrowser — opened at a topic', () => {
  it("shows that topic's cards straight away, whatever was open before", () => {
    sessionStorage.setItem('ree.formulaCards.position', JSON.stringify({ subject: 'EE', topic: 'Protection' }));
    render(<ReferenceBrowser initialSubject="EE" initialTopic="Machines" />);
    expect(screen.getByText('card Slip')).toBeInTheDocument();
    expect(screen.getByText('card Torque')).toBeInTheDocument();
    expect(screen.queryByText('card Fault MVA')).not.toBeInTheDocument();
  });

  it("finds the topic the server's way, whatever the case or spacing another screen names it in", () => {
    render(<ReferenceBrowser initialSubject="ee" initialTopic="  machines " />);
    expect(screen.getByText('card Slip')).toBeInTheDocument();
    expect(screen.getByText('card Torque')).toBeInTheDocument();
  });
});
