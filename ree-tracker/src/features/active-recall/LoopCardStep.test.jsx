import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const rate = vi.fn(() => Promise.resolve('queued'));
vi.mock('../reference/useCardReviews', () => ({ useCardReviews: () => ({ rowFor: () => null, rate }) }));
vi.mock('../reference/NotedFlashcard', () => ({
  default: ({ card, onFlip }) => <button type="button" onClick={() => onFlip(true)}>{card.name}</button>,
}));

const { default: LoopCardStep } = await import('./LoopCardStep');

beforeEach(() => rate.mockClear());

describe('LoopCardStep', () => {
  it('asks for a flip first, then a rating, which is sent (or queued) and moves the session on', () => {
    const onRated = vi.fn();
    render(<LoopCardStep card={{ id: 'c1', name: "Ohm's law" }} rated={false} onRated={onRated} />);
    expect(screen.queryByRole('group', { name: 'How well did you know it?' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: "Ohm's law" }));
    fireEvent.click(screen.getByRole('button', { name: /^Good/ }));
    expect(onRated).toHaveBeenCalledWith('good');
    expect(rate).toHaveBeenCalledWith('c1', 'good');
  });

  it('rates from the keyboard, 1 to 4, once flipped; never twice', () => {
    const onRated = vi.fn();
    const { container, rerender } = render(<LoopCardStep card={{ id: 'c1', name: 'Card' }} rated={false} onRated={onRated} />);
    fireEvent.keyDown(container.firstChild, { key: '1' });
    expect(onRated).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Card' }));
    fireEvent.keyDown(container.firstChild, { key: '1' });
    expect(onRated).toHaveBeenCalledWith('again');
    rerender(<LoopCardStep card={{ id: 'c1', name: 'Card' }} rated onRated={onRated} />);
    fireEvent.keyDown(container.firstChild, { key: '4' });
    expect(onRated).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Rated. It comes back when it's due.")).toBeInTheDocument();
  });
});
