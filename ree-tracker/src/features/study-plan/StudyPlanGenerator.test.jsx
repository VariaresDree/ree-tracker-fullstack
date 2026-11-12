import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const generateStudyPlan = vi.fn();
vi.mock('../../services/dbQueries', () => ({ generateStudyPlan: (...a) => generateStudyPlan(...a), clearStudyPlan: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
let focus = null;
vi.mock('../analytics/useDeepAnalytics', () => ({ useDeepAnalytics: () => ({ data: focus }) }));
const state = { dynamicTOS: { EE: ['Machines'], Mathematics: ['Calculus'] }, stats: { examDate: '2099-01-01' } };
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel(state) }));

const { default: StudyPlanGenerator } = await import('./StudyPlanGenerator');
const { todayManila } = await import('../../utils/manilaDate');

beforeEach(() => { generateStudyPlan.mockReset(); focus = null; });

describe('StudyPlanGenerator', () => {
  it('says what the plan was built from: open mistakes and the formula cards due', async () => {
    generateStudyPlan.mockResolvedValue({ tasksCreated: 44, openMistakes: 2, cardsDue: 6 });
    render(<MemoryRouter><StudyPlanGenerator /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Generate study plan/ }));
    expect(await screen.findByText('Built from your mastery, 2 open mistakes and 6 formula cards due in the next two weeks.')).toBeInTheDocument();
    // heaviest subject first
    expect(generateStudyPlan.mock.calls[0][1][0]).toMatchObject({ subject: 'EE', subtopic: 'Machines' });
  });

  it('shows the focus-time gap beside the plan, without feeding it in', () => {
    focus = { boardMinutes: 300, shares: [{ subject: 'ESAS', weight: 0.3, share: 0.08 }, { subject: 'EE', weight: 0.45, share: 0.6 }] };
    render(<MemoryRouter><StudyPlanGenerator /></MemoryRouter>);
    expect(screen.getByText('From your focus time: ESAS is 30% of the board but 8% of your focus time.')).toBeInTheDocument();
  });
});

describe('with a plan (2026-11-12)', () => {
  const today = todayManila();
  const add = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
  const task = (n, over = {}) => ({ id: `t${n}`, kind: 'drill', topic: n % 2 ? 'Machines' : 'Calculus', subject: 'EE', dueDate: add(today, n), completed: false, createdAt: `${today}T01:00:00Z`, ...over });

  it('says what it holds from today, when it runs out and when it was made', () => {
    const tasks = [task(0), task(1), task(2), task(6, { kind: 'mock', topic: null }), task(-3, { completed: true })];
    render(<MemoryRouter><StudyPlanGenerator tasks={tasks} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Your study plan' })).toBeInTheDocument();
    expect(screen.getByText(/4 tasks left/)).toBeInTheDocument();
    expect(screen.getByText('3 drills on all 2 topics · 1 timed sitting')).toBeInTheDocument();
    expect(screen.getByText('Made today.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Re-plan/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear plan' })).toBeInTheDocument();
    // The pitch is for making a plan, not for one already made.
    expect(screen.queryByText(/Six weeks of tasks/)).not.toBeInTheDocument();
  });

  it('a week old: asks for a re-plan', () => {
    const old = `${add(today, -9)}T01:00:00Z`;
    render(<MemoryRouter><StudyPlanGenerator tasks={[task(1, { createdAt: old }), task(30, { createdAt: old })]} /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('Made 9 days ago. Re-plan so it follows how you’ve done since.');
  });

  it('running out before the exam: asks for a re-plan', () => {
    render(<MemoryRouter><StudyPlanGenerator tasks={[task(1), task(5)]} /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent(/runs out .*before your exam/);
  });

  it('no plan: the pitch, Generate, and no Clear', () => {
    render(<MemoryRouter><StudyPlanGenerator tasks={[]} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Study plan' })).toBeInTheDocument();
    expect(screen.getByText(/Six weeks of tasks/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate study plan/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear plan' })).not.toBeInTheDocument();
  });

  it('says what a re-plan kept, and when today’s work was done', async () => {
    const toast = (await import('react-hot-toast')).default;
    generateStudyPlan.mockResolvedValue({ tasksCreated: 40, kept: 3, startsOn: add(today, 1) });
    render(<MemoryRouter><StudyPlanGenerator tasks={[task(1)]} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Re-plan/ }));
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Planned 40 tasks. Kept 3 tasks you\'d done. Today’s is done, so it starts tomorrow.'));
  });
});
