// QuestionEditModal: the one editor for a live question. Save stays off while
// the question would be ungradable or render as raw LaTeX, and it sends the
// difficulty as a number (the select gives a string, which the API refuses).
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
const { default: QuestionEditModal } = await import('./QuestionEditModal');
const { editIssues } = await import('./editIssues');

const Q = {
  id: 'q1', subject: 'EE', subtopic: '', type: 'conceptual', difficulty: '3',
  text: 'Which gate gives $F = A\'B\'$ for inputs A and B?',
  options: ['NOR', 'NAND', 'XOR', 'AND'], answer: 'NOR', fixedExplanation: '',
};

describe('editIssues', () => {
  it('blocks a stray $ in an option or the explanation', () => {
    expect(editIssues({ ...Q, options: ['NOR', "$F = A'B'C + AB'$$", 'XOR', 'AND'] }).blocking).toContain('Unbalanced $ in the math');
    expect(editIssues({ ...Q, fixedExplanation: 'Since $F = 1' }).blocking).toContain('Unbalanced $ in the math');
  });

  it('blocks two identical options and an answer that is not an option', () => {
    expect(editIssues({ ...Q, options: ['NOR', 'NOR', 'XOR', 'AND'] }).blocking).toContain('Two options are the same');
    expect(editIssues({ ...Q, answer: 'nor gate' }).blocking).toContain('The answer matches none of the options');
  });

  it('passes a clean question', () => {
    expect(editIssues(Q).blocking).toEqual([]);
  });
});

describe('QuestionEditModal', () => {
  it('shows the id and a preview with the key marked, and saves a numeric difficulty', () => {
    const onSave = vi.fn();
    render(<QuestionEditModal question={Q} onChange={() => {}} onClose={() => {}} onSave={onSave} />);
    expect(screen.getByText('q1')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Preview' })).toHaveTextContent('Correct');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'q1', difficulty: 3, isFlagged: false }));
  });

  it('keeps Save off and says why while the math is broken', () => {
    const onSave = vi.fn();
    render(<QuestionEditModal question={{ ...Q, text: 'Which gate gives $F = A\'B\' for A and B?' }} onChange={() => {}} onClose={() => {}} onSave={onSave} />);
    expect(screen.getByText(/Unbalanced \$ in the math\. Fix this to save\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('shows the server’s reason when a save failed', () => {
    render(<QuestionEditModal question={Q} onChange={() => {}} onClose={() => {}} onSave={() => {}} error="Couldn't save: nope" />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save: nope");
  });
});
