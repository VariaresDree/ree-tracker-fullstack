// src/features/assigned-exams/admin/AssignedExamsAdmin.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { apiRequest } from '../../../services/dbQueries';
import AssignedExamsAdmin from './AssignedExamsAdmin';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../../../services/dbQueries', () => ({ apiRequest: vi.fn() }));
vi.mock('./ExamBuilder', () => ({ default: ({ examId }) => <p>builder {String(examId)}</p> }));
vi.mock('./ExamResults', () => ({ default: ({ examId }) => <p>results {examId}</p> }));

const exam = (over = {}) => ({
  id: 'x1', title: 'EE prelim', subject: 'EE', itemCount: 40, timeLimitSecs: 8640, status: 'draft',
  publishedAt: null, updatedAt: '2026-11-20T03:00:00Z', ...over,
});

function Where() {
  return <p data-testid="where">{useLocation().search}</p>;
}
const renderAt = (url = '/admin?tab=exams') => render(
  <MemoryRouter initialEntries={[url]}><AssignedExamsAdmin /><Where /></MemoryRouter>,
);

let items;
beforeEach(() => {
  vi.clearAllMocks();
  items = [exam(), exam({ id: 'x2', title: 'Mixed mock', subject: 'Mixed', status: 'published', publishedAt: '2026-11-18T03:00:00Z' })];
  apiRequest.mockImplementation(async (url, method, body) => {
    if (method === 'GET') return { items };
    if (method === 'PATCH') return { item: body };
    return { success: true };
  });
});

describe('AssignedExamsAdmin', () => {
  it('lists drafts and published exams with their size, time and subject', async () => {
    renderAt();
    const draft = (await screen.findByText('EE prelim')).closest('li');
    expect(within(draft).getByText('Draft')).toBeInTheDocument();
    expect(draft).toHaveTextContent('EE · 40 items · 2 h 24 min');
    const live = screen.getByText('Mixed mock').closest('li');
    expect(within(live).getByText('Published')).toBeInTheDocument();
    expect(live).toHaveTextContent('Mixed subjects');
    // Unpublish waits under More; Results is on the row.
    expect(within(live).queryByRole('button', { name: 'Unpublish' })).toBeNull();
    expect(within(live).getByRole('button', { name: 'Results' })).toBeInTheDocument();
    fireEvent.click(within(live).getByRole('button', { name: 'More for Mixed mock' }));
    expect(within(live).getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
  });

  it('groups exams under their kind, with counts', async () => {
    items = [exam(), exam({ id: 'q1', title: 'Quiz 1', kind: 'quiz' }), exam({ id: 'q2', title: 'Quiz 2', kind: 'quiz' }), exam({ id: 'p1', title: 'Trig problems', kind: 'problem-set' })];
    renderAt();
    await screen.findByText('Quiz 1');
    const groups = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(groups).toEqual(['Exams 1', 'Quizzes 2', 'Problem sets 1']);
  });

  it('finds exams by words, type and status, and clears the filters', async () => {
    items = [exam(), exam({ id: 'q1', title: 'Trig quiz', kind: 'quiz', status: 'published', publishedAt: '2026-11-18T03:00:00Z' }), exam({ id: 'q2', title: 'Algebra quiz', kind: 'quiz' })];
    renderAt();
    await screen.findByText('Trig quiz');
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'quiz' } });
    expect(screen.queryByText('EE prelim')).toBeNull();
    expect(screen.getByText('Algebra quiz')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Published' }));
    expect(screen.queryByText('Algebra quiz')).toBeNull();
    expect(screen.getByText('Trig quiz')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'algebra' } });
    expect(screen.getByText('No exams match')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('EE prelim')).toBeInTheDocument();
    expect(screen.getByText('Algebra quiz')).toBeInTheDocument();
  });

  it('moves an exam to another kind from More', async () => {
    renderAt();
    const draft = (await screen.findByText('EE prelim')).closest('li');
    fireEvent.click(within(draft).getByRole('button', { name: 'More for EE prelim' }));
    fireEvent.change(within(draft).getByLabelText('Type'), { target: { value: 'practice-set' } });
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/admin/assigned-exams/x1', 'PATCH', { kind: 'practice-set' }, expect.anything()));
    expect(toast.success).toHaveBeenCalledWith('Moved to Practice sets.');
    expect(await screen.findByRole('heading', { level: 3, name: /Practice sets/ })).toBeInTheDocument();
  });

  it('publishes a draft for every learner', async () => {
    renderAt();
    const draft = (await screen.findByText('EE prelim')).closest('li');
    fireEvent.click(within(draft).getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(within(draft).getByText('Published')).toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith('/api/admin/assigned-exams/x1', 'PATCH', { status: 'published' }, expect.anything());
    expect(toast.success).toHaveBeenCalledWith('Published for every learner.');
  });

  it('locks a published exam so learners see it but can’t start it, and unlocks it', async () => {
    renderAt();
    const live = (await screen.findByText('Mixed mock')).closest('li');
    const draft = (await screen.findByText('EE prelim')).closest('li');
    fireEvent.click(within(draft).getByRole('button', { name: 'More for EE prelim' }));
    expect(within(draft).queryByRole('button', { name: 'Lock' })).toBeNull();
    fireEvent.click(within(live).getByRole('button', { name: 'More for Mixed mock' }));
    fireEvent.click(within(live).getByRole('button', { name: 'Lock' }));
    await waitFor(() => expect(within(live).getByText('Locked')).toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith('/api/admin/assigned-exams/x2', 'PATCH', { locked: true }, expect.anything());
    expect(within(live).getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
  });

  it('shows when a scheduled exam opens and closes', async () => {
    items = [exam({ status: 'published', publishedAt: '2026-11-18T03:00:00Z', availability: 'upcoming', opensAt: '2026-11-28T00:00:00Z', closesAt: '2026-11-30T09:00:00Z' })];
    renderAt();
    const row = (await screen.findByText('EE prelim')).closest('li');
    expect(within(row).getByText('Scheduled')).toBeInTheDocument();
    expect(row).toHaveTextContent(/Opens .* · Closes /);
  });

  it('deletes only after a second, plainer press', async () => {
    renderAt();
    const draft = (await screen.findByText('EE prelim')).closest('li');
    fireEvent.click(within(draft).getByRole('button', { name: 'More for EE prelim' }));
    fireEvent.click(within(draft).getByRole('button', { name: 'Delete' }));
    expect(apiRequest).not.toHaveBeenCalledWith(expect.anything(), 'DELETE', null, expect.anything());
    fireEvent.click(within(draft).getByRole('button', { name: 'Delete for good' }));
    await waitFor(() => expect(screen.queryByText('EE prelim')).toBeNull());
    expect(apiRequest).toHaveBeenCalledWith('/api/admin/assigned-exams/x1', 'DELETE', null, expect.anything());
  });

  it('opens the builder in the address, so Back leaves it', async () => {
    renderAt();
    fireEvent.click(await screen.findByRole('button', { name: /New exam/ }));
    expect(screen.getByText('builder null')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('?tab=exams&exam=new');
  });

  it('says how many took an exam and opens its results', async () => {
    items = [exam({ status: 'published', publishedAt: '2026-11-18T03:00:00Z', takers: 4, average: 63 })];
    renderAt();
    const row = (await screen.findByText('EE prelim')).closest('li');
    expect(row).toHaveTextContent('4 learners took it · average 63% on the first try');
    fireEvent.click(within(row).getByRole('button', { name: 'Results' }));
    expect(screen.getByTestId('where')).toHaveTextContent('?tab=exams&results=x1');
    expect(screen.getByText('results x1')).toBeInTheDocument();
  });

  it('opens a saved exam for editing', () => {
    renderAt('/admin?tab=exams&exam=x2');
    expect(screen.getByText('builder x2')).toBeInTheDocument();
  });

  it('starts with a way in when there are none', async () => {
    items = [];
    renderAt();
    expect(await screen.findByText('No exams yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New exam/ })).toBeInTheDocument();
  });

  it('offers another try when the list won’t load', async () => {
    apiRequest.mockRejectedValueOnce(new Error('[OFFLINE]'));
    renderAt();
    expect(await screen.findByText(/You’re offline/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('EE prelim')).toBeInTheDocument();
  });
});
