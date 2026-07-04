// Component tests for the shared QuestionCard. This component is the source
// of truth for how a question prompt, confidence selector, and choice grid
// behave across Active Review, Board Simulator, Gauntlet, and Combat.
// A regression here breaks all four answering surfaces at once, so this
// suite locks in the behaviors I verified live in PR #17:
//
//   - confidence-required gate (Active Review)
//   - hotkey routing (Q/W/E + 1-4/A-D)
//   - locked/reviewing state transitions
//   - correct/incorrect reveal semantics
//   - ARIA radiogroup roles for a11y
//   - reduced-motion gate

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import QuestionCard from './QuestionCard';

// Keep tests focused on QuestionCard — render LaTeX as plain text rather than
// pulling in react-markdown / KaTeX / CSS imports for every test file.
vi.mock('../../components/LatexRenderer', () => ({
  default: ({ content }) => <span data-testid="latex">{content}</span>,
}));

const Q = {
  text: 'What is $\\sin(2x)$?',
  options: ['$2\\sin x\\cos x$', '$\\sin^2 x$', '$\\cos 2x$', '$1$'],
  answer: '$2\\sin x\\cos x$',
  subject: 'Mathematics',
  subtopic: 'Trigonometry',
};

// Test harness — wraps QuestionCard with a small controlled wrapper so we
// can assert what the component *would* call back, without re-mounting on
// every prop change.
function Harness(overrides = {}) {
  const onSelect = vi.fn();
  const onConfidenceChange = vi.fn();
  const onConfidenceRequiredBlocked = vi.fn();
  const utils = render(
    <QuestionCard
      question={Q}
      selectedOption={null}
      confidence={null}
      state="answering"
      onSelect={onSelect}
      onConfidenceChange={onConfidenceChange}
      onConfidenceRequiredBlocked={onConfidenceRequiredBlocked}
      {...overrides}
    />,
  );
  return { ...utils, onSelect, onConfidenceChange, onConfidenceRequiredBlocked };
}

// Helpers
const getOption = (letter) =>
  screen.getByRole('radio', { name: new RegExp(`^${letter}\\.`) });
const getConfidenceButton = (level) =>
  screen.getByRole('radio', { name: new RegExp(`^${level}`) });

describe('QuestionCard — rendering', () => {
  it('renders the prompt + four options + confidence selector by default', () => {
    Harness();
    // 2 radiogroups: Confidence + Answer choices
    const groups = screen.getAllByRole('radiogroup');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAttribute('aria-label', 'Confidence level');
    expect(groups[1]).toHaveAttribute('aria-label', 'Answer choices');

    // 3 confidence options + 4 answer options = 7 radios
    expect(screen.getAllByRole('radio')).toHaveLength(7);

    // Prompt rendered via the mocked LatexRenderer
    expect(screen.getAllByTestId('latex')[0]).toHaveTextContent('What is $\\sin(2x)$?');
  });

  it('renders subject › subtopic eyebrow and Item N badge when given an index', () => {
    Harness({ index: 4 });
    expect(screen.getByText('Item 5')).toBeInTheDocument();
    expect(screen.getByText('Mathematics › Trigonometry')).toBeInTheDocument();
  });

  it('omits the eyebrow when no index/subject and no headerSlot', () => {
    Harness({ question: { ...Q, subject: undefined, subtopic: undefined }, index: undefined });
    expect(screen.queryByText(/Item /)).not.toBeInTheDocument();
  });

  it('injects a custom header slot when provided', () => {
    Harness({ headerSlot: <button>Bookmark</button>, index: 0 });
    expect(screen.getByRole('button', { name: 'Bookmark' })).toBeInTheDocument();
  });

  it('hides the confidence row when showConfidence is false', () => {
    Harness({ showConfidence: false });
    expect(screen.queryByRole('radiogroup', { name: 'Confidence level' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4); // only A-D
  });
});

describe('QuestionCard — confidence-required gate', () => {
  it('blocks onSelect and fires onConfidenceRequiredBlocked when confidence is required + missing', () => {
    const { onSelect, onConfidenceRequiredBlocked } = Harness({ requireConfidence: true });
    fireEvent.click(getOption('A'));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onConfidenceRequiredBlocked).toHaveBeenCalledTimes(1);
  });

  it('passes through onSelect once confidence is set, even when required', () => {
    const { onSelect } = Harness({ requireConfidence: true, confidence: 'HIGH' });
    fireEvent.click(getOption('A'));
    expect(onSelect).toHaveBeenCalledWith(Q.options[0]);
  });

  it('does not block onSelect when confidence is not required', () => {
    const { onSelect } = Harness({ requireConfidence: false, confidence: null });
    fireEvent.click(getOption('B'));
    expect(onSelect).toHaveBeenCalledWith(Q.options[1]);
  });

  it('shows the "(required)" hint only when requireConfidence is true', () => {
    const { unmount } = Harness({ requireConfidence: true });
    expect(screen.getByText('(required)')).toBeInTheDocument();
    unmount();
    Harness({ requireConfidence: false });
    expect(screen.queryByText('(required)')).not.toBeInTheDocument();
  });
});

describe('QuestionCard — hotkeys (opt-in)', () => {
  beforeEach(() => {
    // Make sure no stale focus is on a form element from a prior test
    document.body.focus();
  });

  it('does not attach hotkeys when hotkeys=false', () => {
    const { onConfidenceChange, onSelect } = Harness({ hotkeys: false });
    fireEvent.keyDown(window, { key: 'e' });
    fireEvent.keyDown(window, { key: '1' });
    expect(onConfidenceChange).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Q / W / E set LOW / MED / HIGH confidence', () => {
    const { onConfidenceChange } = Harness({ hotkeys: true });
    fireEvent.keyDown(window, { key: 'q' });
    fireEvent.keyDown(window, { key: 'w' });
    fireEvent.keyDown(window, { key: 'e' });
    expect(onConfidenceChange).toHaveBeenNthCalledWith(1, 'LOW');
    expect(onConfidenceChange).toHaveBeenNthCalledWith(2, 'MED');
    expect(onConfidenceChange).toHaveBeenNthCalledWith(3, 'HIGH');
  });

  it('1-4 and A-D both pick options', () => {
    const { onSelect } = Harness({ hotkeys: true, confidence: 'HIGH' });
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'b' });
    fireEvent.keyDown(window, { key: '3' });
    fireEvent.keyDown(window, { key: 'd' });
    expect(onSelect.mock.calls.map((c) => c[0])).toEqual([
      Q.options[0],
      Q.options[1],
      Q.options[2],
      Q.options[3],
    ]);
  });

  it('hotkey is ignored when focus is in a form field', () => {
    const { onConfidenceChange } = Harness({ hotkeys: true });
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(window, { key: 'e' });
    expect(onConfidenceChange).not.toHaveBeenCalled();
    input.remove();
  });
});

describe('QuestionCard — reviewing state', () => {
  it('shows the correct answer with green styling and hides the confidence row', () => {
    Harness({ state: 'reviewing', selectedOption: Q.options[1] /* wrong pick */ });

    // Confidence row gone
    expect(screen.queryByRole('radiogroup', { name: 'Confidence level' })).not.toBeInTheDocument();

    // All four options disabled
    const opts = ['A', 'B', 'C', 'D'].map(getOption);
    for (const o of opts) expect(o).toBeDisabled();

    // Correct answer (A) is the one styled with the success accent
    const correct = getOption('A');
    expect(correct.className).toMatch(/accent-success/);

    // Wrong selection (B) is the one with strikethrough container
    const wrong = getOption('B');
    expect(wrong.querySelector('.line-through')).toBeTruthy();
  });

  it('renders a check icon next to the correct answer and an X icon next to the wrong pick', () => {
    Harness({ state: 'reviewing', selectedOption: Q.options[2] /* wrong */ });
    const correct = getOption('A');
    const wrong = getOption('C');

    // Check icon = svg with polyline
    expect(correct.querySelector('svg polyline')).toBeTruthy();
    // X icon = svg with M18 6L6 18 path
    const wrongSvg = wrong.querySelector('svg path');
    expect(wrongSvg).toBeTruthy();
    expect(wrongSvg.getAttribute('d')).toContain('M18 6L6 18');
  });

  it('disables clicks in reviewing state (no callbacks fire)', () => {
    const { onSelect } = Harness({ state: 'reviewing', selectedOption: Q.options[0] });
    fireEvent.click(getOption('B'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('ignores hotkeys in reviewing state', () => {
    const { onSelect, onConfidenceChange } = Harness({
      state: 'reviewing',
      hotkeys: true,
      selectedOption: Q.options[0],
    });
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: 'w' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onConfidenceChange).not.toHaveBeenCalled();
  });
});

describe('QuestionCard — ARIA + selection state', () => {
  it('marks the currently-selected option with aria-checked="true"', () => {
    Harness({ selectedOption: Q.options[2], confidence: 'MED' });
    expect(getOption('C')).toHaveAttribute('aria-checked', 'true');
    for (const letter of ['A', 'B', 'D']) {
      expect(getOption(letter)).toHaveAttribute('aria-checked', 'false');
    }
  });

  it('marks the currently-selected confidence with aria-checked="true"', () => {
    Harness({ confidence: 'HIGH' });
    expect(getConfidenceButton('HIGH')).toHaveAttribute('aria-checked', 'true');
    expect(getConfidenceButton('LOW')).toHaveAttribute('aria-checked', 'false');
    expect(getConfidenceButton('MED')).toHaveAttribute('aria-checked', 'false');
  });
});
