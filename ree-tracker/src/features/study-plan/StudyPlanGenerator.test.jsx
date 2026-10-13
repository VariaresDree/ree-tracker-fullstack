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
