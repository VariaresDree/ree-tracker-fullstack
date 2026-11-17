import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import TopicPicker from './TopicPicker';
import { Modal } from '../../components/ui';

// The topic checklist (2026-11-17): a field that opens a checklist, shared by
// Practice, the custom mock and the custom battle.

expect.extend(axeMatchers);
const MATH = ['Algebra', 'Trigonometry', 'Complex Numbers', 'Calculus 1'];

function Host({ initial = [], onPick = () => {} }) {
  const [value, setValue] = useState(initial);
  return <TopicPicker topics={MATH} value={value} onChange={(v) => { setValue(v); onPick(v); }} />;
}
const field = () => screen.getByRole('button', { name: /^Topics/ });
const panel = () => screen.getByRole('group', { name: 'Topics' });

describe('TopicPicker', () => {
  it('closed, it says what is picked; open, each topic is a checkbox', () => {
    render(<Host />);
    expect(field()).toHaveTextContent('All topics');
    expect(field()).toHaveTextContent('All 4');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: 'Topics' })).toBeNull();
    fireEvent.click(field());
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(within(panel()).getAllByRole('checkbox')).toHaveLength(5);
    expect(within(panel()).getByRole('checkbox', { name: 'All topics' })).toBeChecked();
  });

  it('ticking topics picks them, in the subject’s order; ticking all of them is all; Clear and All reset', () => {
    const onPick = vi.fn();
    render(<Host onPick={onPick} />);
    fireEvent.click(field());
    fireEvent.click(within(panel()).getByRole('checkbox', { name: 'Complex Numbers' }));
    fireEvent.click(within(panel()).getByRole('checkbox', { name: 'Algebra' }));
    expect(onPick).toHaveBeenLastCalledWith(['Algebra', 'Complex Numbers']);
    expect(field()).toHaveTextContent('Algebra and Complex Numbers');
    expect(field()).toHaveTextContent('2 of 4');
    expect(within(panel()).getByRole('checkbox', { name: 'All topics' })).not.toBeChecked();
    fireEvent.click(within(panel()).getByRole('button', { name: 'Clear' }));
    expect(onPick).toHaveBeenLastCalledWith([]);
    for (const t of MATH) fireEvent.click(within(panel()).getByRole('checkbox', { name: t }));
    expect(onPick).toHaveBeenLastCalledWith([]); // every topic is all of them
    fireEvent.click(within(panel()).getByRole('checkbox', { name: 'Trigonometry' }));
    fireEvent.click(within(panel()).getByRole('checkbox', { name: 'All topics' }));
    expect(onPick).toHaveBeenLastCalledWith([]);
  });

  it('three or more read as "and N more"', () => {
    render(<Host initial={['Algebra', 'Trigonometry', 'Calculus 1']} />);
    expect(field()).toHaveTextContent('Algebra, Trigonometry and 1 more');
  });

  it('Done, or Escape, closes the checklist and returns to the field; Escape leaves the sheet open', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Build your own"><Host /></Modal>);
    fireEvent.click(field());
    fireEvent.click(within(panel()).getByRole('button', { name: 'Done' }));
    expect(field()).toHaveAttribute('aria-expanded', 'false');
    expect(field()).toHaveFocus();
    fireEvent.click(field());
    fireEvent.keyDown(within(panel()).getByRole('checkbox', { name: 'Algebra' }), { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Topics' })).toBeNull();
    expect(field()).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has no axe violations, closed or open', async () => {
    const { container } = render(<Host initial={['Algebra']} />);
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations();
    fireEvent.click(field());
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations();
  });
});

describe('TopicPicker shows each topic’s equal share (2026-11-17)', () => {
  it('with two or more picked and a session length, it says the share; none otherwise', () => {
    const { rerender } = render(<TopicPicker topics={MATH} value={['Algebra', 'Trigonometry', 'Complex Numbers']} onChange={() => {}} count={20} />);
    expect(screen.getByText('Equal share: 6 or 7 questions from each.')).toBeInTheDocument();
    rerender(<TopicPicker topics={MATH} value={['Algebra']} onChange={() => {}} count={20} />);
    expect(screen.queryByText(/Equal share/)).toBeNull();
    rerender(<TopicPicker topics={MATH} value={['Algebra', 'Trigonometry']} onChange={() => {}} />);
    expect(screen.queryByText(/Equal share/)).toBeNull();
  });
});
