import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./Flashcard', () => ({ default: ({ card }) => <p>card {card.name}</p> }));
const { default: ReferenceStudyMode } = await import('./ReferenceStudyMode');

describe('ReferenceStudyMode', () => {
  it('takes focus on open, so the arrow keys work straight away', () => {
    const onExit = vi.fn();
    render(<ReferenceStudyMode cards={[{ id: 'a', name: 'Ohm' }, { id: 'b', name: 'Watt' }]} onExit={onExit} />);
    const region = screen.getByRole('region', { name: /Study mode/ });
    expect(region).toHaveFocus();
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(screen.getByText('card Watt')).toBeInTheDocument();
    fireEvent.keyDown(region, { key: 'Escape' });
    expect(onExit).toHaveBeenCalled();
  });
});
