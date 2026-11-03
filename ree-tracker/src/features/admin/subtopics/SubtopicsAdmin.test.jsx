import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const apiRequest = vi.fn();
vi.mock('../../../services/dbQueries', () => ({ apiRequest }));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: SubtopicsAdmin } = await import('./SubtopicsAdmin');

const sub = (id, topicId, name, sortOrder, active = true) => ({ id, topicId, name, sortOrder, active });
const DATA = {
  topics: [
    { id: 't-alg', subject: 'Mathematics', name: 'Algebra', sortOrder: 1 },
    { id: 't-trig', subject: 'Mathematics', name: 'Trigonometry', sortOrder: 2 },
    { id: 't-em', subject: 'EE', name: 'Electromagnetism', sortOrder: 1 },
  ],
  items: [
    sub('a', 't-alg', 'Functions', 0),
    sub('b', 't-alg', 'Age Problems', 1),
    sub('c', 't-alg', 'Old One', 2, false),
    sub('e', 't-em', 'Coulomb', 0),
  ],
};

const list = () => within(screen.getByRole('list', { name: 'Subtopics, in order' }));
const show = async () => {
  render(<SubtopicsAdmin />);
  await screen.findByRole('list', { name: 'Subtopics, in order' });
};

beforeEach(() => {
  vi.clearAllMocks();
  apiRequest.mockResolvedValue(DATA);
});

describe('Admin › Subtopics', () => {
  it('lists a topic’s live subtopics in order, with counts, and retired ones apart', async () => {
    await show();
    expect(list().getAllByRole('listitem').map((li) => li.textContent)).toEqual([expect.stringContaining('Functions'), expect.stringContaining('Age Problems')]);
    expect(screen.getByRole('option', { name: 'Algebra (2)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Trigonometry (0)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Retired' })).toBeInTheDocument();
    expect(screen.getByText('Old One')).toBeInTheDocument();
  });

  it('switches subject and topic', async () => {
    await show();
    fireEvent.click(screen.getByRole('radio', { name: 'EE' }));
    expect(list().getByText('Coulomb')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Math' }));
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 't-trig' } });
    expect(screen.getByText(/no subtopics yet/)).toBeInTheDocument();
  });

  it('adds several, one per line, ignoring blank lines', async () => {
    await show();
    apiRequest.mockResolvedValueOnce({ items: [...DATA.items.filter((s) => s.topicId === 't-alg'), sub('n', 't-alg', 'Work Problems', 3)], added: 1 });
    fireEvent.change(screen.getByLabelText(/Add subtopics/), { target: { value: 'Work Problems\n\n  Mixture Problems  \n' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to this topic' }));
    await waitFor(() => expect(list().getByText('Work Problems')).toBeInTheDocument());
    expect(apiRequest.mock.calls[1].slice(0, 3)).toEqual(['/api/admin/subtopics', 'POST', { topicId: 't-alg', names: ['Work Problems', 'Mixture Problems'] }]);
    expect(screen.getByLabelText(/Add subtopics/)).toHaveValue('');
  });

  it('moves a row, sending the whole order with retired rows last', async () => {
    await show();
    apiRequest.mockResolvedValueOnce({ items: [sub('b', 't-alg', 'Age Problems', 0), sub('a', 't-alg', 'Functions', 1), sub('c', 't-alg', 'Old One', 2, false)] });
    fireEvent.click(screen.getByRole('button', { name: 'Move Age Problems up' }));
    await waitFor(() => expect(list().getAllByRole('listitem')[0]).toHaveTextContent('Age Problems'));
    expect(apiRequest.mock.calls[1][2]).toEqual({ topicId: 't-alg', ids: ['b', 'a', 'c'] });
  });

  it('can’t move the first row up or the last row down', async () => {
    await show();
    expect(screen.getByRole('button', { name: 'Move Functions up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Age Problems down' })).toBeDisabled();
  });

  it('renames a row', async () => {
    await show();
    apiRequest.mockResolvedValueOnce({ item: sub('a', 't-alg', 'Functions and Graphs', 0) });
    fireEvent.click(screen.getByRole('button', { name: 'Rename Functions' }));
    fireEvent.change(screen.getByLabelText('Subtopic name'), { target: { value: 'Functions and Graphs' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Functions and Graphs')).toBeInTheDocument();
    expect(apiRequest.mock.calls[1].slice(0, 3)).toEqual(['/api/admin/subtopics/a', 'PUT', { name: 'Functions and Graphs' }]);
  });

  it('retires a row and restores it', async () => {
    await show();
    apiRequest.mockResolvedValueOnce({ item: sub('a', 't-alg', 'Functions', 0, false) });
    fireEvent.click(within(list().getByText('Functions').closest('li')).getByRole('button', { name: 'Retire' }));
    await waitFor(() => expect(list().queryByText('Functions')).not.toBeInTheDocument());
    expect(apiRequest.mock.calls[1][2]).toEqual({ active: false });
    apiRequest.mockResolvedValueOnce({ item: sub('c', 't-alg', 'Old One', 2, true) });
    fireEvent.click(within(screen.getByText('Old One').closest('li')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(list().getByText('Old One')).toBeInTheDocument());
  });

  it('says what went wrong when a save fails, and keeps the list', async () => {
    await show();
    apiRequest.mockRejectedValueOnce(new Error('This topic already has a subtopic with that name.'));
    fireEvent.click(screen.getByRole('button', { name: 'Rename Functions' }));
    fireEvent.change(screen.getByLabelText('Subtopic name'), { target: { value: 'Age Problems' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('This topic already has a subtopic with that name.'));
    expect(list().getByText('Functions')).toBeInTheDocument();
  });

  it('offers another try when it can’t load', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Server trouble'));
    render(<SubtopicsAdmin />);
    expect(await screen.findByText('Server trouble')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(await screen.findByText('Functions')).toBeInTheDocument();
  });
});
