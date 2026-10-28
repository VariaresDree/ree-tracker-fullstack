// The rating calculator (Exams › Past sittings › Outside scores): raw scores
// rated the PRC way, and the score the subject still to sit needs. Pins the
// wording of each case and that it agrees with gradeBoardExam's rounding.
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import RatingCalculator from './RatingCalculator';

expect.extend(axeMatchers);

const AXE_OPTS = {
  rules: {
    'color-contrast': { enabled: false },
    'html-has-lang': { enabled: false },
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
    region: { enabled: false },
    'document-title': { enabled: false },
  },
};

const field = (subject, label) => within(screen.getByRole('group', { name: subject })).getByLabelText(label);
const enter = (subject, score, items) => {
  fireEvent.change(field(subject, 'Score'), { target: { value: String(score) } });
  if (items != null) fireEvent.change(field(subject, 'Items'), { target: { value: String(items) } });
};

const open = () => render(<RatingCalculator open onClose={() => {}} />);

describe('RatingCalculator', () => {
  it('starts on the PRC format and asks for scores', () => {
    open();
    expect(screen.getByRole('dialog', { name: 'Rating calculator' })).toBeInTheDocument();
    expect(field('EE', 'Items')).toHaveValue(100);
    expect(screen.getByText(/Enter all three scores for the rating/)).toBeInTheDocument();
  });

  it('says what the subject left needs, given the other two', () => {
    open();
    enter('Mathematics', 72);
    enter('ESAS', 65);
    expect(screen.getByText('What EE needs')).toBeInTheDocument();
    expect(screen.getByText('73 of 100')).toBeInTheDocument();
    // a 50-item paper scales the target
    enter('ESAS', 65);
    fireEvent.change(field('EE', 'Items'), { target: { value: '50' } });
    expect(screen.getByText('37 of 50')).toBeInTheDocument();
  });

  it('rates a full board on the weighted average and shows how to pass from there', () => {
    open();
    enter('Mathematics', 90);
    enter('ESAS', 60);
    enter('EE', 64);
    expect(screen.getByText('69.3')).toBeInTheDocument(); // 71.3 raw, 69.3 weighted
    expect(screen.getByText('Not passed')).toBeInTheDocument();
    const ways = screen.getByText(/To pass, raise one subject to/).nextElementSibling;
    expect(within(ways).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Mathematics: 93 of 100 (93%)',
      'ESAS: 63 of 100 (63%)',
      'EE: 66 of 100 (66%)',
    ]);
  });

  it('holds the 50% floor: a met average with a subject under it is a conditional pass', () => {
    open();
    enter('Mathematics', 100);
    enter('ESAS', 100);
    enter('EE', 45);
    expect(screen.getByText('75.25')).toBeInTheDocument();
    expect(screen.getByText('Conditional pass')).toBeInTheDocument();
    expect(screen.getByText(/EE is under the 50% subject floor/)).toBeInTheDocument();
    const ways = screen.getByText(/To pass, raise one subject to/).nextElementSibling;
    expect(within(ways).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['EE: 50 of 100 (50%)']);
  });

  it('says when no score can pass, and why', () => {
    open();
    enter('Mathematics', 40);
    enter('ESAS', 95);
    expect(screen.getByText(/Mathematics is under the 50% subject floor, so no EE score passes the board/)).toBeInTheDocument();
    enter('Mathematics', 50);
    enter('ESAS', 50);
    fireEvent.change(field('Mathematics', 'Score'), { target: { value: '' } });
    enter('EE', 50);
    expect(screen.getByText(/Even 100 of 100 in Mathematics falls short of the 70 average/)).toBeInTheDocument();
  });

  it('flags a score above the item count and leaves it out of the rating', () => {
    open();
    enter('Mathematics', 120);
    expect(screen.getByText('More than the number of items.')).toBeInTheDocument();
    enter('ESAS', 70);
    enter('EE', 70);
    expect(screen.queryByText('Weighted rating')).not.toBeInTheDocument();
  });

  it('Clear empties every score', () => {
    open();
    enter('Mathematics', 72);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(field('Mathematics', 'Score')).toHaveValue(null);
  });

  it('has no axe violations with a full rating on screen', async () => {
    open();
    enter('Mathematics', 90);
    enter('ESAS', 60);
    enter('EE', 64);
    expect(await axe(document.body, AXE_OPTS)).toHaveNoViolations();
  });
});
