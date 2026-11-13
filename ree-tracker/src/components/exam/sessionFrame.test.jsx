// One bar and one set of actions for every session, so a phone sees the question
// and not a stack of chrome, and Next is never a scroll away.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SessionBar, { LeaveButton, SubmitButton } from './SessionBar';
import SessionActions, { SessionNav } from './SessionActions';
import SubmitDialog from './SubmitDialog';
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

  it('keeps Submit last and unshrinkable, giving up the answered count on a phone', () => {
    render(<SessionBar index={0} total={5} answered={3} submit={<SubmitButton onClick={() => {}} />}><span>clock</span></SessionBar>);
    const submit = screen.getByRole('button', { name: 'Submit exam' });
    expect(submit).toHaveTextContent(/^Submit$/);
    expect(submit.className).toMatch(/shrink-0/);
    expect(submit.previousElementSibling).toHaveTextContent('clock');
    expect(screen.getByText('3 answered').className).toMatch(/max-sm:hidden/);
  });

  it('fills Submit only once every item is answered', () => {
    const { rerender } = render(<SubmitButton onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Submit exam' }).className).toMatch(/border-\[var\(--btn-accent\)\]/);
    rerender(<SubmitButton allAnswered onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Submit exam' }).className).not.toMatch(/border-\[var\(--btn-accent\)\]/);
  });

  it('Leave keeps its name when a phone shows only the icon', () => {
    render(<LeaveButton onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
    expect(screen.getByText('Leave').className).toMatch(/max-sm:hidden/);
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

describe('SessionNav', () => {
  const props = () => ({ onPrevious: vi.fn(), onNext: vi.fn(), onReview: vi.fn() });

  it('has Previous and Next, with no way to submit between them', () => {
    const p = props();
    render(<SessionNav atStart atEnd={false} {...p} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(p.onNext).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /submit/i })).toBeNull();
  });

  it('turns Next into Review and submit on the last item', () => {
    const p = props();
    render(<SessionNav atStart={false} atEnd {...p} />);
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Review and submit' }));
    expect(p.onReview).toHaveBeenCalledTimes(1);
  });

  it('just stops at the end when there is nothing to submit', () => {
    render(<SessionNav atStart={false} atEnd onPrevious={() => {}} onNext={() => {}} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});

describe('SubmitDialog', () => {
  const dialog = (props = {}) => render(<SubmitDialog open onClose={() => {}} onSubmit={() => {}} onJump={() => {}} {...props} />);

  it('says how much is answered when something is still open', () => {
    dialog({ unanswered: [3, 7], total: 100 });
    expect(screen.getByText('98 of 100 answered')).toBeInTheDocument();
    expect(screen.getByText(/items are left blank/)).toBeInTheDocument();
  });

  it('leaves the count out when everything is done', () => {
    dialog({ total: 100 });
    expect(screen.queryByText(/of 100 answered/)).toBeNull();
    expect(screen.getByText(/Every item is answered/)).toBeInTheDocument();
  });

  // A second tap on "Review and submit" can land where the confirm appears.
  it('ignores taps on the confirm for a moment after opening', () => {
    vi.useFakeTimers();
    try {
      dialog();
      const confirm = screen.getByRole('button', { name: 'Submit exam' });
      // Every Button has `disabled:pointer-events-none`; this is the plain class.
      expect(confirm.className).toMatch(/(^|\s)pointer-events-none/);
      expect(confirm).toBeEnabled();
      act(() => { vi.advanceTimersByTime(400); });
      expect(confirm.className).not.toMatch(/(^|\s)pointer-events-none/);
    } finally {
      vi.useRealTimers();
    }
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

describe('ItemActions — reporting', () => {
  it('asks why, in one tap, and sends the reason', () => {
    const onReport = vi.fn();
    render(<ItemActions onReport={onReport} />);
    fireEvent.click(screen.getByRole('button', { name: 'Report a problem with this question' }));
    expect(onReport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'The answer key looks wrong' }));
    expect(onReport).toHaveBeenCalledWith('The answer key looks wrong');
    expect(screen.queryByRole('dialog')).toBeNull();
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

// Practice (2026-11-13): five icons crowded the question header on a phone.
// The scratchpad and the report stay in reach (owner's call); the calculator
// and the note go into the More sheet.
describe('ItemActions with more', () => {
  it('keeps the scratchpad, the report and the bookmark in the row; the calculator and the note are under More', async () => {
    const onTools = vi.fn();
    render(<ItemActions more onScratchpad={() => {}} onTools={onTools} onReport={() => {}} onBookmark={() => {}} moreItems={<button type="button">Add a note</button>} />);
    for (const name of ['Open scratchpad', 'Report a problem with this question', 'Save to bookmarks']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Open calculator and units' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add a note' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More for this question' }));
    expect(await screen.findByRole('button', { name: 'Add a note' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open calculator and units' }));
    expect(onTools).toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'More for this question' })).toBeNull();
  });
});

describe('SessionBar noun', () => {
  it('Practice counts questions; a mock keeps Item, as its answer sheet does', () => {
    render(<SessionBar index={2} total={20} noun="Question" />);
    expect(screen.getByText('Question 3 of 20')).toBeInTheDocument();
  });
});
