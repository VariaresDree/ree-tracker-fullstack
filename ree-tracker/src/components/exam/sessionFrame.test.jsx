// One bar and one set of actions for every session, so a phone sees the question
// and not a stack of chrome, and Next is never a scroll away.
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionBar from './SessionBar';
import SessionActions from './SessionActions';
import ItemActions from './ItemActions';
import KeyLegend from './KeyLegend';
import { KEYS, letterIn } from '../../features/quiz/examCopy';

describe('SessionBar', () => {
  it('says which item this is, in full for a screen reader and short on a phone', () => {
    const { container } = render(<SessionBar index={2} total={100} />);
    expect(screen.getByText('Item 3 of 100').className).toMatch(/max-sm:sr-only/);
    expect(screen.getByText('3/100')).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstChild.className).toMatch(/sticky/);
    // One row, whatever is in it.
    expect(container.firstChild.className).not.toMatch(/flex-wrap/);
  });

  it('says about, when the total is an estimate', () => {
    render(<SessionBar index={0} total={19} about />);
    expect(screen.getByText('Item 1 of about 19').className).not.toMatch(/sr-only/);
    expect(screen.queryByText('1/19')).toBeNull();
  });

  it('shows answered only where it was given', () => {
    const { rerender } = render(<SessionBar index={0} total={5} answered={3} />);
    expect(screen.getByText('3 answered')).toBeInTheDocument();
    rerender(<SessionBar index={0} total={5} />);
    expect(screen.queryByText(/answered/)).toBeNull();
  });
});

describe('SessionActions', () => {
  it('stays in view above the phone bar, and comes down when the bar hides', () => {
    render(<SessionActions><button type="button">Next</button></SessionActions>);
    const bar = screen.getByRole('button', { name: 'Next' }).parentElement;
    expect(bar.className).toMatch(/sticky/);
    expect(bar.className).toMatch(/bottom-\[calc\(var\(--bottom-bar-h/);
    expect(bar.className).toMatch(/data-bottom-bar-hidden/);
  });
});

describe('ItemActions', () => {
  it('uses one set of words, and has no button for what it wasn’t given', () => {
    render(<ItemActions onScratchpad={() => {}} onReport={() => {}} onBookmark={() => {}} />);
    expect(screen.getByRole('button', { name: 'Open scratchpad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Report a problem with this question' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save to bookmarks' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /Mark for review/ })).toBeNull();
  });

  it('a reported item says so and can’t be reported again', () => {
    render(<ItemActions onReport={() => {}} reported />);
    expect(screen.getByRole('button', { name: 'Already reported' })).toBeDisabled();
  });

  it('shows what’s marked and saved', () => {
    render(<ItemActions onMark={() => {}} marked onBookmark={() => {}} bookmarked />);
    expect(screen.getByRole('button', { name: 'Unmark for review' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Remove from bookmarks' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('KeyLegend', () => {
  it('lists the keys from its button', () => {
    render(<KeyLegend keys={KEYS.exam} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Keyboard shortcuts/ }));
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(dialog).toHaveTextContent('Mark for review');
    expect(dialog).toHaveTextContent('This list');
  });

  it('opens on ?, but not while typing', () => {
    render(<><input aria-label="note" /><KeyLegend keys={KEYS.practice} /></>);
    const input = screen.getByLabelText('note');
    input.focus();
    fireEvent.keyDown(input, { key: '?' });
    expect(screen.queryByRole('dialog')).toBeNull();
    input.blur();
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
  });
});

describe('letterIn', () => {
  it('finds the letter by place, and nothing for a blank or a missing value', () => {
    expect(letterIn(['x', 'y'], 'y')).toBe('B');
    expect(letterIn(['x', 'y'], null)).toBeNull();
    expect(letterIn(['x', 'y'], 'z')).toBeNull();
    expect(letterIn(undefined, 'z')).toBeNull();
  });
});

describe('the words', () => {
  it('has a legend for every kind of session', () => {
    for (const keys of Object.values(KEYS)) expect(keys.length).toBeGreaterThan(2);
  });
});
