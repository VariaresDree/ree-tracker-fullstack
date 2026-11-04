// Next used to leave you in the middle of the next question, with focus gone.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useItemFocus } from './useItemFocus';

function Item({ id, inner }) {
  const ref = useItemFocus(id);
  return <div ref={ref} tabIndex={-1} data-testid="item">{inner}</div>;
}

const place = (el, top) => {
  el.getBoundingClientRect = () => ({ top });
  el.scrollIntoView = vi.fn();
  el.style.scrollMarginTop = '100px';
};

describe('useItemFocus', () => {
  it('does nothing on the first item, so opening a session doesn’t jump', () => {
    render(<Item id={0} />);
    expect(document.activeElement).toBe(document.body);
  });

  it('moves focus to the next item', () => {
    const { rerender } = render(<Item id={0} />);
    place(screen.getByTestId('item'), 200);
    rerender(<Item id={1} />);
    expect(document.activeElement).toBe(screen.getByTestId('item'));
  });

  it('scrolls to its top when you’ve read past it', () => {
    const { rerender } = render(<Item id={0} />);
    const el = screen.getByTestId('item');
    place(el, -400);
    rerender(<Item id={1} />);
    expect(el.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
  });

  it('leaves the page alone when its top is already in view', () => {
    const { rerender } = render(<Item id={0} />);
    const el = screen.getByTestId('item');
    place(el, 200);
    rerender(<Item id={1} />);
    expect(el.scrollIntoView).not.toHaveBeenCalled();
  });

  it('leaves focus that’s already inside it', () => {
    const { rerender } = render(<Item id={0} inner={<button type="button">Show answer</button>} />);
    const button = screen.getByRole('button', { name: 'Show answer' });
    place(screen.getByTestId('item'), 200);
    button.focus();
    rerender(<Item id={1} inner={<button type="button">Show answer</button>} />);
    expect(document.activeElement).toBe(button);
  });

  it('does nothing when the same item re-renders', () => {
    const { rerender } = render(<Item id={0} />);
    place(screen.getByTestId('item'), -400);
    rerender(<Item id={0} />);
    expect(screen.getByTestId('item').scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);
  });
});
