import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const apiRequest = vi.fn();
vi.mock('../../../services/dbQueries', () => ({ apiRequest }));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: TopicSubtopics } = await import('./TopicSubtopics');

const sub = (id, name, sortOrder, active = true) => ({ id, topicId: 't-alg', name, sortOrder, active });
const ROWS = [sub('a', 'Functions', 0), sub('b', 'Age Problems', 1), sub('c', 'Old One', 2, false)];

function Host({ initial = ROWS }) {
  const [rows, setRows] = useState(initial);
  return <TopicSubtopics topicId="t-alg" rows={rows} onRows={setRows} onRow={(item) => setRows((r) => r.map((s) => (s.id === item.id ? item : s)))} />;
}

const list = () => within(screen.getByRole('list', { name: 'Subtopics, in order' }));

beforeEach(() => vi.clearAllMocks());

describe('A topic’s subtopics', () => {
  it('lists live subtopics in order, with retired ones apart', () => {
    render(<Host />);
    expect(list().getAllByRole('listitem').map((li) => li.textContent)).toEqual([expect.stringContaining('Functions'), expect.stringContaining('Age Problems')]);
    expect(within(screen.getByRole('region', { name: 'Retired subtopics' })).getByText('Old One')).toBeInTheDocument();
  });

  it('says so when there are none', () => {
    render(<Host initial={[]} />);
    expect(screen.getByText(/no subtopics yet/)).toBeInTheDocument();
  });

  it('adds several, one per line, ignoring blank lines', async () => {
    render(<Host />);
    apiRequest.mockResolvedValueOnce({ items: [...ROWS, sub('n', 'Work Problems', 3)], added: 1 });
    fireEvent.change(screen.getByLabelText(/Add subtopics/), { target: { value: 'Work Problems\n\n  Mixture Problems  \n' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to this topic' }));
    await waitFor(() => expect(list().getByText('Work Problems')).toBeInTheDocument());
    expect(apiRequest.mock.calls[0].slice(0, 3)).toEqual(['/api/admin/subtopics', 'POST', { topicId: 't-alg', names: ['Work Problems', 'Mixture Problems'] }]);
    expect(screen.getByLabelText(/Add subtopics/)).toHaveValue('');
  });

  it('moves a row, sending the whole order with retired rows last', async () => {
    render(<Host />);
    apiRequest.mockResolvedValueOnce({ items: [sub('b', 'Age Problems', 0), sub('a', 'Functions', 1), sub('c', 'Old One', 2, false)] });
    fireEvent.click(screen.getByRole('button', { name: 'Move Age Problems up' }));
    await waitFor(() => expect(list().getAllByRole('listitem')[0]).toHaveTextContent('Age Problems'));
    expect(apiRequest.mock.calls[0][2]).toEqual({ topicId: 't-alg', ids: ['b', 'a', 'c'] });
  });

  it('can’t move the first row up or the last row down', () => {
    render(<Host />);
    expect(screen.getByRole('button', { name: 'Move Functions up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Age Problems down' })).toBeDisabled();
  });

  it('renames a row', async () => {
    render(<Host />);
    apiRequest.mockResolvedValueOnce({ item: sub('a', 'Functions and Graphs', 0) });
    fireEvent.click(screen.getByRole('button', { name: 'Rename Functions' }));
    fireEvent.change(screen.getByLabelText('Subtopic name'), { target: { value: 'Functions and Graphs' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Functions and Graphs')).toBeInTheDocument();
    expect(apiRequest.mock.calls[0].slice(0, 3)).toEqual(['/api/admin/subtopics/a', 'PUT', { name: 'Functions and Graphs' }]);
  });

  it('retires a row and restores it', async () => {
    render(<Host />);
    apiRequest.mockResolvedValueOnce({ item: sub('a', 'Functions', 0, false) });
    fireEvent.click(within(list().getByText('Functions').closest('li')).getByRole('button', { name: 'Retire' }));
    await waitFor(() => expect(list().queryByText('Functions')).not.toBeInTheDocument());
    expect(apiRequest.mock.calls[0][2]).toEqual({ active: false });
    apiRequest.mockResolvedValueOnce({ item: sub('c', 'Old One', 2, true) });
    fireEvent.click(within(screen.getByText('Old One').closest('li')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(list().getByText('Old One')).toBeInTheDocument());
  });

  it('says what went wrong when a save fails, and keeps the list', async () => {
    render(<Host />);
    apiRequest.mockRejectedValueOnce(new Error('This topic already has a subtopic with that name.'));
    fireEvent.click(screen.getByRole('button', { name: 'Rename Functions' }));
    fireEvent.change(screen.getByLabelText('Subtopic name'), { target: { value: 'Age Problems' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('This topic already has a subtopic with that name.'));
    expect(list().getByText('Functions')).toBeInTheDocument();
  });
});
