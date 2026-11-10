// Getting started: four steps that tick themselves, the five places on
// request, and Skip kept on the account and on this device.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const saveExamConfig = vi.fn(() => Promise.resolve({ queued: false }));
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel({ saveExamConfig }) }));
const { default: FirstRunTour } = await import('./FirstRunTour');

const renderTour = (props = {}) => {
  const onDone = vi.fn();
  render(<MemoryRouter><FirstRunTour uid="u1" placed={false} hasDate={false} hasPlan={false} practised={false} onDone={onDone} {...props} /></MemoryRouter>);
  return onDone;
};

beforeEach(() => { localStorage.clear(); saveExamConfig.mockClear(); });

describe('Getting started', () => {
  it('lists the four steps in order, each linking to where it is done', () => {
    renderTour();
    expect(screen.getByRole('heading', { name: 'Getting started' })).toBeInTheDocument();
    expect(screen.getByText(/^0 of 4 done/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '0 of 4 steps done' })).toBeInTheDocument();
    const steps = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(steps.map((li) => li.querySelector('span span').textContent)).toEqual([
      'Take the placement test', 'Set your exam date', 'Make your study plan', 'Answer your first practice set',
    ]);
    for (const [name, to] of [['Take the test', '/diagnostic'], ['Set the date', '/account#exam-plan'], ['Make the plan', '/progress?tab=plan'], ['Start practising', '/practice']]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', to);
    }
  });

  it('a step already done is ticked, says so, and offers no link', () => {
    renderTour({ placed: true, practised: true });
    expect(screen.getByText(/^2 of 4 done/)).toBeInTheDocument();
    expect(screen.getAllByText('(done)')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'Take the test' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Start practising' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Make the plan' })).toBeInTheDocument();
  });

  it('shows the five places when asked', () => {
    renderTour();
    const toggle = screen.getByRole('button', { name: 'Your way around' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /^Library/ })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    for (const [name, to] of [[/^Today/, '/'], [/^Practice/, '/practice'], [/^Exams/, '/exams'], [/^Progress/, '/progress'], [/^Library/, '/library']]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', to);
    }
  });

  it('Skip ends it on the account and on this device', () => {
    const onDone = renderTour();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onDone).toHaveBeenCalled();
    expect(saveExamConfig).toHaveBeenCalledWith({ tourDone: true });
    expect(localStorage.getItem('ree_tour_seen:u1')).toBe('1');
  });

  it('a failed save still hides it here, by the device key', async () => {
    saveExamConfig.mockRejectedValueOnce(new Error('Settings update failed.'));
    const onDone = renderTour();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onDone).toHaveBeenCalled();
    expect(localStorage.getItem('ree_tour_seen:u1')).toBe('1');
  });
});
