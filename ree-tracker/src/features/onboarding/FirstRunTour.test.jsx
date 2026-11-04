import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FirstRunTour from './FirstRunTour';

const renderTour = (props = {}) => {
  const onDone = vi.fn();
  render(<MemoryRouter><FirstRunTour uid="u1" placed={false} hasDate={false} hasPlan={false} onDone={onDone} {...props} /></MemoryRouter>);
  return onDone;
};

beforeEach(() => localStorage.clear());

describe('FirstRunTour', () => {
  it('shows the five places, each one a link', () => {
    renderTour();
    expect(screen.getByRole('heading', { name: 'Your way around' })).toBeInTheDocument();
    for (const [name, to] of [[/^Today/, '/'], [/^Practice/, '/practice'], [/^Exams/, '/exams'], [/^Progress/, '/progress'], [/^Library/, '/library']]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', to);
    }
  });

  it('then the first day, in order, linking to each step', () => {
    renderTour();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Your first day' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Take the test' })).toHaveAttribute('href', '/diagnostic');
    expect(screen.getByRole('link', { name: 'Set the date' })).toHaveAttribute('href', '/account#exam-plan');
    expect(screen.getByRole('link', { name: 'Make the plan' })).toHaveAttribute('href', '/progress?tab=plan');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Your way around' })).toBeInTheDocument();
  });

  it('a step already done says so and offers no link', () => {
    renderTour({ placed: true, hasDate: true });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getAllByText('(done)')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'Take the test' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Set the date' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Make the plan' })).toBeInTheDocument();
  });

  it.each(['Skip', 'Done'])('%s ends it for this account on this device', (name) => {
    const onDone = renderTour();
    if (name === 'Done') fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name }));
    expect(onDone).toHaveBeenCalled();
    expect(localStorage.getItem('ree_tour_seen:u1')).toBe('1');
  });
});
