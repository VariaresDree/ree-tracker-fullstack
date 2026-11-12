// Getting started: three steps that tick themselves, the quickest first (10
// questions in one tap, then the exam date with the plan in the same save,
// then the placement test, optional), the five places on request, and Skip
// kept on the account and on this device.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const saveExamConfig = vi.fn(() => Promise.resolve({ queued: false }));
const store = { saveExamConfig, dynamicTOS: { EE: ['Machines'], Mathematics: ['Calculus'] }, stats: { examDate: null } };
vi.mock('../../store/useStore', () => ({ useStore: Object.assign((sel) => sel(store), { getState: () => store }) }));
const generateStudyPlan = vi.fn(async () => ({ tasksCreated: 40 }));
vi.mock('../../services/dbQueries', () => ({ generateStudyPlan: (...a) => generateStudyPlan(...a) }));
const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));
const { default: FirstRunTour } = await import('./FirstRunTour');

function PracticeProbe() {
  const { state } = useLocation();
  return <p>practice: {JSON.stringify(state?.preset)}</p>;
}
const renderTour = (props = {}) => {
  const onDone = vi.fn();
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<FirstRunTour uid="u1" placed={false} hasDate={false} hasPlan={false} practised={false} onDone={onDone} {...props} />} />
        <Route path="/practice" element={<PracticeProbe />} />
      </Routes>
    </MemoryRouter>,
  );
  return onDone;
};
const later = (days) => new Date(Date.now() + days * 86400000 + 8 * 3600000).toISOString().slice(0, 10);

beforeEach(() => {
  localStorage.clear();
  saveExamConfig.mockClear();
  saveExamConfig.mockImplementation(() => Promise.resolve({ queued: false }));
  generateStudyPlan.mockClear();
  store.stats = { examDate: null };
  toast.mockClear(); toast.success.mockClear();
});

describe('Getting started', () => {
  it('three steps, the quickest first, the placement test last and optional', () => {
    renderTour();
    expect(screen.getByRole('heading', { name: 'Getting started' })).toBeInTheDocument();
    expect(screen.getByText(/^0 of 3 done/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '0 of 3 steps done' })).toBeInTheDocument();
    const steps = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(steps.map((li) => li.querySelector('span span').textContent)).toEqual([
      'Answer your first 10 questions', 'Set your exam date and plan', 'Take the placement test (optional)',
    ]);
    expect(screen.getByRole('link', { name: 'Take the test' })).toHaveAttribute('href', '/diagnostic');
  });

  it('the first set starts with one tap: 10 mixed questions', async () => {
    renderTour();
    fireEvent.click(screen.getByRole('button', { name: /Start 10 questions/ }));
    const preset = JSON.parse((await screen.findByText(/^practice:/)).textContent.slice('practice: '.length));
    expect(preset).toMatchObject({ count: 10, source: 'library', studyMode: 'interleaved' });
  });

  it('saving the exam date makes the plan in the same tap, from every syllabus topic', async () => {
    renderTour({ practised: true });
    const date = later(120);
    fireEvent.change(screen.getByLabelText('Board exam date'), { target: { value: date } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and make my plan' }));
    await waitFor(() => expect(generateStudyPlan).toHaveBeenCalled());
    expect(saveExamConfig).toHaveBeenCalledWith({ examDate: date });
    expect(generateStudyPlan.mock.calls[0][0]).toBe(date);
    expect(generateStudyPlan.mock.calls[0][1].map((t) => t.subtopic).sort()).toEqual(['Calculus', 'Machines']);
    // Ticked here at once, before Today's plan read catches up.
    expect(await screen.findByText(/^2 of 3 done/)).toBeInTheDocument();
  });

  it('a date already set: only the plan is left to make', async () => {
    store.stats = { examDate: later(90) };
    renderTour({ hasDate: true });
    expect(screen.getByText('Make your study plan')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Make my plan' }));
    await waitFor(() => expect(generateStudyPlan).toHaveBeenCalledWith(store.stats.examDate, expect.any(Array)));
    expect(saveExamConfig).not.toHaveBeenCalled();
  });

  it('a past date is refused on the card; offline, the date waits and no plan is made', async () => {
    renderTour();
    fireEvent.change(screen.getByLabelText('Board exam date'), { target: { value: '2020-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and make my plan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Pick a date after today.');
    expect(saveExamConfig).not.toHaveBeenCalled();
    saveExamConfig.mockResolvedValueOnce({ queued: true });
    fireEvent.change(screen.getByLabelText('Board exam date'), { target: { value: later(60) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and make my plan' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringMatching(/Saved on this device/)));
    expect(generateStudyPlan).not.toHaveBeenCalled();
  });

  it('a step already done is ticked, says so, and offers nothing to do', () => {
    renderTour({ placed: true, practised: true });
    expect(screen.getByText(/^2 of 3 done/)).toBeInTheDocument();
    expect(screen.getAllByText('(done)')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'Take the test' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start 10 questions/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save and make my plan' })).toBeInTheDocument();
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
