// Progress › Study plan: a failed load is an error with Try again (not "No
// tasks yet"), a calendar day filters the list, the add form is labelled, and
// Clear plan asks first.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { todayManila } from '../../utils/manilaDate';
import { expectNoSkippedLevels } from '../../test/headings';

vi.mock('../analytics/useDeepAnalytics', () => ({ useDeepAnalytics: () => ({ data: null, status: 'ready' }) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
const api = { apiRequest: vi.fn(), generateStudyPlan: vi.fn(), clearStudyPlan: vi.fn() };
vi.mock('../../services/dbQueries', () => ({
  apiRequest: (...a) => api.apiRequest(...a),
  generateStudyPlan: (...a) => api.generateStudyPlan(...a),
  clearStudyPlan: (...a) => api.clearStudyPlan(...a),
}));
const state = { stats: { examDate: '2027-04-01' }, dynamicTOS: { Mathematics: ['Calculus'], ESAS: ['Statics'], EE: ['Machines'] } };
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel(state) }));
// The key dates and rest days (their own tests are KeyDatesCard.test.jsx).
const planCalendar = {
  items: [{ id: 'k1', kind: 'preboard', title: 'RC Preboard 2', startsOn: manilaToday(), endsOn: null }],
  prefs: { restWeekdays: [], reviewMode: 'self' },
  status: 'ready', queuedCount: 0, add: vi.fn(), update: vi.fn(), remove: vi.fn(), savePrefs: vi.fn(), reload: vi.fn(),
};
vi.mock('../study-plan/usePlanCalendar', () => ({ usePlanCalendar: () => planCalendar }));
function manilaToday() { return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10); }

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

  it('its headings step down from the Progress h1 without skipping a level', async () => {
    api.apiRequest.mockResolvedValueOnce({ items: [{ id: 't1', text: 'Redo transformers', completed: false, dueDate: today }] });
    const { container } = renderTab();
    await screen.findByText('Redo transformers');
    expectNoSkippedLevels(container);
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
    // The day names its key date as well as its tasks, and lists it when picked.
    fireEvent.click(screen.getByRole('button', { name: /, today, Preboard: RC Preboard 2, 1 open task$/ }));
    expect(screen.getByText('Due today')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: /^Key dates on / })).getByText('RC Preboard 2')).toBeInTheDocument();
    expect(screen.queryByText('No date')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show every task/ }));
    expect(screen.getByText('No date')).toBeInTheDocument();
  });

  it('groups the list into Overdue, Today and Next 7 days, with Later and Done folded', async () => {
    const shift = (n) => {
      const [y, m, d] = today.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
    };
    api.apiRequest.mockResolvedValueOnce({
      items: [
        { id: 'a', text: 'Missed drill', completed: false, dueDate: shift(-2) },
        { id: 'b', text: 'Today drill', completed: false, dueDate: today },
        { id: 'c', text: 'Soon drill', completed: false, dueDate: shift(3) },
        { id: 'd', text: 'Far drill 1', completed: false, dueDate: shift(20) },
        { id: 'e', text: 'Far drill 2', completed: false, dueDate: shift(30) },
        { id: 'f', text: 'Old drill', completed: true, dueDate: shift(-5) },
      ],
    });
    renderTab();
    await screen.findByText('Today drill');
    const section = (name) => screen.getByRole('heading', { level: 3, name: new RegExp(`^${name}`) }).closest('section');
    expect(within(section('Overdue')).getByText('Missed drill')).toBeInTheDocument();
    expect(within(section('Today')).getByText('Today drill')).toBeInTheDocument();
    expect(within(section('Next 7 days')).getByText('Soon drill')).toBeInTheDocument();
    // Later and Done are folded until asked for.
    expect(screen.queryByText('Far drill 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Old drill')).not.toBeInTheDocument();
    const later = screen.getByRole('button', { name: /Show 2 later tasks/ });
    expect(later).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(later);
    expect(within(section('Later')).getByText('Far drill 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hide later tasks/ })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Show 1 done task/ }));
    expect(screen.getByText('Old drill')).toBeInTheDocument();
    // The counts sit under the calendar.
    expect(screen.getByLabelText('Open tasks')).toHaveTextContent('Overdue1Today1Next 7 days1');
    // A row lays out by the list's width: Start under the name when narrow.
    const rowEl = screen.getByText('Today drill').closest('[data-task-row]');
    expect(rowEl.className).toMatch(/grid-cols-\[auto_minmax\(0,1fr\)_auto\] @lg:grid-cols-\[auto_minmax\(0,1fr\)_auto_auto\]/);
    expect(rowEl.closest('.\\@container')).not.toBeNull();
  });

  it('puts the calendar beside the plan, and the task list full width below them', async () => {
    api.apiRequest.mockResolvedValueOnce({ items: [] });
    renderTab();
    await screen.findByText('No tasks yet');
    const setup = document.querySelector('[data-plan-setup]');
    // The plan takes two of three columns on a wide page; the calendar the third.
    const plan = within(setup).getByRole('heading', { name: 'Study plan' }).closest('.card-edge');
    expect(plan.className).toMatch(/@4xl:col-span-2/);
    expect(within(setup).getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    // The task list is not in that row.
    expect(within(setup).queryByRole('heading', { name: 'Your tasks' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Your tasks' })).toBeInTheDocument();
  });

  it("shows the day's count on today's task only", async () => {
    const [y, m, d] = today.split('-').map(Number);
    const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    api.apiRequest.mockResolvedValueOnce({
      items: [
        { id: 'a', kind: 'drill', text: 'Today drill', completed: false, dueDate: today, progress: { count: 3, target: 50 } },
        { id: 'b', kind: 'drill', text: 'Tomorrow drill', completed: false, dueDate: tomorrow, progress: { count: 3, target: 50 } },
      ],
    });
    renderTab();
    await screen.findByText('Today drill');
    expect(screen.getByText('Today drill').closest('li')).toHaveTextContent('3/50 today');
    expect(screen.getByText('Tomorrow drill').closest('li')).not.toHaveTextContent('today');
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
