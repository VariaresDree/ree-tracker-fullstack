import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AnswerSheet from './AnswerSheet';
import ExamNavigator from './ExamNavigator';

if (!window.HTMLElement.prototype.scrollTo) window.HTMLElement.prototype.scrollTo = () => {};

describe('AnswerSheet', () => {
  it('reads each row as the item, the letter answered, and marks', () => {
    const onSelect = vi.fn();
    render(
      <AnswerSheet
        count={3}
        currentIndex={0}
        onSelect={onSelect}
        letterOf={(i) => (i === 1 ? 'B' : null)}
        isMarked={(i) => i === 2}
      />,
    );
    const rows = within(screen.getByRole('list', { name: 'Answer sheet' })).getAllByRole('button');
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Item 1, not answered',
      'Item 2, answered B',
      'Item 3, not answered, marked for review',
    ]);
    expect(rows[0]).toHaveAttribute('aria-current', 'step');
    fireEvent.click(rows[2]);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('in review, names the correct letter and keeps the item numbers of a filtered set', () => {
    render(
      <AnswerSheet count={1} currentIndex={0} letterOf={() => 'A'} correctLetterOf={() => 'C'} numberOf={() => 41} />,
    );
    expect(screen.getByRole('button', { name: 'Item 41, answered A, correct answer C' })).toBeInTheDocument();
  });
});

describe('ExamNavigator — answer sheet view', () => {
  it('switches between the strip and the sheet when a sheet is offered', () => {
    render(<ExamNavigator count={2} currentIndex={0} isAnswered={(i) => i === 0} sheet={{ letterOf: (i) => (i === 0 ? 'D' : null) }} />);
    expect(screen.queryByRole('list', { name: 'Answer sheet' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Answer sheet' }));
    expect(screen.getByRole('button', { name: 'Item 1, answered D' })).toBeInTheDocument();
  });

  it('offers no switch without a sheet', () => {
    render(<ExamNavigator count={2} currentIndex={0} />);
    expect(screen.queryByRole('radio', { name: 'Answer sheet' })).not.toBeInTheDocument();
  });
});
