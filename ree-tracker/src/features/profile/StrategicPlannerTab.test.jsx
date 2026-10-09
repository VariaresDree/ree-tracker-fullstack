// Progress › Study plan: a failed load is an error with Try again (not "No
// tasks yet"), a calendar day filters the list, the add form is labelled, and
// Clear plan asks first.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { todayManila } from '../../utils/manilaDate';

vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
const api = { apiRequest: vi.fn(), generateStudyPlan: vi.fn(), clearStudyPlan: vi.fn() };
vi.mock('../../services/dbQueries', () => ({
  apiRequest: (...a) => api.apiRequest(...a),
  generateStudyPlan: (...a) => api.generateStudyPlan(...a),
  clearStudyPlan: (...a) => api.clearStudyPlan(...a),
}));
const state = { stats: { examDate: '2027-04-01' }, dynamicTOS: { Mathematics: ['Calculus'], ESAS: ['Statics'], EE: ['Machines'] } };
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel(state) }));

const { default: StrategicPlannerTab } = await import('./StrategicPlannerTab');

const today = todayManila();
const renderTab = () => render(<MemoryRouter><StrategicPlannerTab currentUser={{ uid: 'u1' }} /></MemoryRouter>);

beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

describe('StrategicPlannerTab', () => {
  it('a failed load says so and Try again loads', async () => {
    api.apiRequest
      .mockRejectedValueOnce(new Error('500'))
      .mockResolvedValueOnce({ items: [{ id: 't1', text: 'Redo transformers', completed: false, dueDate: null }] });
    renderTab();
    expect(await screen.findByText("Couldn't load your tasks")).toBeInTheDocument();
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Redo transformers')).toBeInTheDocument();
  });

  it('a day on the calendar filters the list to it', async () => {
    api.apiRequest.mockResolvedValueOnce({
      items: [
        { id: 't1', text: 'Due today', completed: false, dueDate: today },
        { id: 't2', text: 'No date', completed: false, dueDate: null },
      ],
    });
    renderTab();
    await screen.findByText('Due today');
    fireEvent.click(screen.getByRole('button', { name: /, today, 1 open task$/ }));
    expect(screen.getByText('Due today')).toBeInTheDocument();
    expect(screen.queryByText('No date')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show every task/ }));
    expect(screen.getByText('No date')).toBeInTheDocument();
  });

  it('adds a task from labelled fields', async () => {
    api.apiRequest.mockResolvedValueOnce({ items: [] });
    renderTab();
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
    api.apiRequest.mockResolvedValueOnce({ task: { id: 't9', text: 'Statics set', completed: false, dueDate: null } });
    fireEvent.change(screen.getByLabelText('New task'), { target: { value: 'Statics set' } });
    expect(screen.getByLabelText('Due (optional)')).toHaveAttribute('type', 'date');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('Statics set')).toBeInTheDocument();
    expect(api.apiRequest).toHaveBeenLastCalledWith('/api/user/tasks', 'POST', { text: 'Statics set', dueDate: null });
  });

  it('Clear plan asks first', async () => {
    api.apiRequest.mockResolvedValue({ items: [] });
    api.clearStudyPlan.mockResolvedValue({ deleted: 3 });
    renderTab();
    await screen.findByText('No tasks yet');
    fireEvent.click(screen.getByRole('button', { name: 'Clear plan' }));
    expect(api.clearStudyPlan).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'Clear your study plan?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear plan' }));
    expect(api.clearStudyPlan).toHaveBeenCalledTimes(1);
  });
});
