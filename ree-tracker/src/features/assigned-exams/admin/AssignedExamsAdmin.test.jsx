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
    if (method === 'PATCH') return { item: { status: body.status } };
    return { success: true };
  });
});

describe('AssignedExamsAdmin', () => {
  it('lists drafts and published exams with their size, time and subject', async () => {
    renderAt();
    const draft = (await screen.findByText('EE prelim')).closest('li');
    expect(within(draft).getByText('Draft')).toBeInTheDocument();
    expect(draft).toHaveTextContent('40 items · 2 h 24 min · EE');
    const live = screen.getByText('Mixed mock').closest('li');
    expect(within(live).getByText('Published')).toBeInTheDocument();
    expect(live).toHaveTextContent('Mixed subjects');
    expect(within(live).getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
  });

  it('publishes a draft for every learner', async () => {
    renderAt();
    const draft = (await screen.findByText('EE prelim')).closest('li');
    fireEvent.click(within(draft).getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(within(draft).getByText('Published')).toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith('/api/admin/assigned-exams/x1', 'PATCH', { status: 'published' }, expect.anything());
    expect(toast.success).toHaveBeenCalledWith('Published for every learner.');
  });

  it('deletes only after a second, plainer press', async () => {
    renderAt();
    const draft = (await screen.findByText('EE prelim')).closest('li');
    fireEvent.click(within(draft).getByRole('button', { name: 'Delete EE prelim' }));
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
