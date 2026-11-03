// Admin › Syllabus: a subject's topics, the board's items per topic, and each
// topic's subtopics, on one screen. Counts wait for Save changes.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const apiRequest = vi.fn();
const updateDynamicTOS = vi.fn();
vi.mock('../../../services/dbQueries', () => ({ apiRequest, updateDynamicTOS }));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));
const setDynamicTOS = vi.fn();
vi.mock('../../../store/useStore', () => ({ useStore: (sel) => sel({ dynamicTOS: {}, setDynamicTOS }) }));

const { default: SyllabusAdmin } = await import('./SyllabusAdmin');

const TOPICS = [
  { id: 'alg', subject: 'Mathematics', name: 'Algebra', sortOrder: 1 },
  { id: 'cx', subject: 'Mathematics', name: 'Complex Numbers', sortOrder: 2 },
  { id: 'trig', subject: 'Mathematics', name: 'Trigonometry', sortOrder: 3 },
  { id: 'vec', subject: 'Mathematics', name: 'Vector Analysis', sortOrder: 4 },
  { id: 'em', subject: 'EE', name: 'Electromagnetism', sortOrder: 1 },
];
const SUBS = { topics: TOPICS, items: [{ id: 'a', topicId: 'alg', name: 'Functions', sortOrder: 0, active: true }, { id: 'x', topicId: 'alg', name: 'Old', sortOrder: 1, active: false }] };
const groups = (math = [{ items: 5, topics: ['Algebra', 'Complex Numbers'], topicIds: ['alg', 'cx'] }, { items: 95, topics: ['Trigonometry'], topicIds: ['trig'] }]) => ({
  Mathematics: math,
  ESAS: [],
  EE: [{ items: 100, topics: ['Electromagnetism'], topicIds: ['em'] }],
});
const BOARD = { custom: false, groups: groups() };
const BANK = { items: [{ subject: 'Mathematics', topic: 'Algebra', count: 1025 }, { subject: 'Mathematics', topic: 'Complex Numbers', count: 189 }, { subject: 'Mathematics', topic: 'Trigonometry', count: 700 }] };

let responses;
beforeEach(() => {
  vi.clearAllMocks();
  responses = { '/api/admin/subtopics': SUBS, '/api/config/board-blueprint': BOARD, '/api/admin/bank-counts': BANK };
  apiRequest.mockImplementation(async (url) => responses[url]);
  updateDynamicTOS.mockResolvedValue({});
});

const show = async () => {
  render(<SyllabusAdmin />);
  await screen.findByRole('list', { name: 'Math board counts' });
};
const items = (names) => screen.getByRole('spinbutton', { name: `Items for ${names}` });
const openTopic = (name) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}:`) }));
const save = () => screen.getByRole('button', { name: 'Save changes' });
const lastCall = (method) => apiRequest.mock.calls.filter((c) => c[1] === method).at(-1);

describe('Admin › Syllabus', () => {
  it('shows each count, its topics, the bank beside it, and the topics with no count', async () => {
    await show();
    expect(items('Algebra, Complex Numbers')).toHaveValue(5);
    expect(screen.getByText('Total 100 of 100')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Algebra: 1,025 questions · 1 subtopics$/ })).toBeInTheDocument();
    // (1025 + 189) / 5 items
    expect(screen.getByText(/243 per item/)).toBeInTheDocument();
    const noCount = screen.getByRole('region', { name: 'No count' });
    expect(within(noCount).getByText('Vector Analysis')).toBeInTheDocument();
    expect(screen.getByText('Using PRC’s table (2024).')).toBeInTheDocument();
  });

  it('marks a thin count, and still works without the bank’s numbers', async () => {
    responses['/api/admin/bank-counts'] = { items: [{ subject: 'Mathematics', topic: 'Trigonometry', count: 100 }] };
    const { unmount } = render(<SyllabusAdmin />);
    // Trigonometry 100 over 95 items, and Algebra's count with no questions at all.
    expect(await screen.findAllByText('Thin')).toHaveLength(2);
    unmount();
    apiRequest.mockImplementation(async (url) => {
      if (url === '/api/admin/bank-counts') throw new Error('slow');
      return responses[url];
    });
    await show();
    expect(screen.getByRole('button', { name: /^Trigonometry: 0 subtopics$/ })).toBeInTheDocument();
  });

  it('changes a count as a draft, warns on the total, and saves every subject with Save changes', async () => {
    await show();
    expect(save()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'More: Items for Trigonometry' }));
    expect(screen.getByText('Total 101 of 100')).toBeInTheDocument();
    expect(screen.getByText('Papers scale to fit')).toBeInTheDocument();
    expect(lastCall('PUT')).toBeUndefined();

    responses['/api/admin/board-blueprint'] = { custom: true, groups: groups([{ items: 5, topics: ['Algebra', 'Complex Numbers'], topicIds: ['alg', 'cx'] }, { items: 96, topics: ['Trigonometry'], topicIds: ['trig'] }]) };
    fireEvent.click(save());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Board counts saved.'));
    expect(lastCall('PUT').slice(0, 3)).toEqual(['/api/admin/board-blueprint', 'PUT', {
      Mathematics: [{ items: 5, topicIds: ['alg', 'cx'] }, { items: 96, topicIds: ['trig'] }],
      ESAS: [],
      EE: [{ items: 100, topicIds: ['em'] }],
    }]);
    expect(save()).toBeDisabled();
    expect(screen.getByText('Using your own counts.')).toBeInTheDocument();
  });

  it('Discard puts the counts back', async () => {
    await show();
    fireEvent.click(screen.getByRole('button', { name: 'Fewer: Items for Trigonometry' }));
    expect(items('Trigonometry')).toHaveValue(94);
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(items('Trigonometry')).toHaveValue(95);
    expect(save()).toBeDisabled();
  });

  it('says why a save was refused, and keeps the draft', async () => {
    await show();
    fireEvent.click(screen.getByRole('button', { name: 'More: Items for Trigonometry' }));
    apiRequest.mockRejectedValueOnce(new Error('Algebra is counted twice.'));
    fireEvent.click(save());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Algebra is counted twice.'));
    expect(items('Trigonometry')).toHaveValue(96);
    expect(save()).not.toBeDisabled();
  });

  it('Give items moves a topic into the count', async () => {
    await show();
    fireEvent.click(screen.getByRole('button', { name: 'Give items: Vector Analysis' }));
    expect(items('Vector Analysis')).toHaveValue(5);
    expect(screen.queryByRole('region', { name: 'No count' })).not.toBeInTheDocument();
    expect(screen.getByText('Total 105 of 100')).toBeInTheDocument();
  });

  it('in a topic’s sheet: split off, share with, and no count', async () => {
    await show();
    openTopic('Complex Numbers');
    let sheet = within(screen.getByRole('dialog'));
    expect(sheet.getByText(/5 items, shared with Algebra/)).toBeInTheDocument();

    fireEvent.click(sheet.getByRole('button', { name: 'Split off' }));
    expect(sheet.getByText(/^0 items\./)).toBeInTheDocument();
    expect(items('Complex Numbers')).toHaveValue(0);
    expect(items('Algebra')).toHaveValue(5);

    fireEvent.change(sheet.getByLabelText('Share a count with'), { target: { value: '0' } });
    expect(items('Algebra, Complex Numbers')).toHaveValue(5);

    fireEvent.click(sheet.getByRole('button', { name: 'No count' }));
    sheet = within(screen.getByRole('dialog'));
    expect(sheet.getByText(/No count: it only fills/)).toBeInTheDocument();
    expect(items('Algebra')).toHaveValue(5);
    expect(sheet.getByRole('button', { name: 'Give items' })).toBeInTheDocument();
  });

  it('shows a topic’s subtopics in its sheet', async () => {
    await show();
    openTopic('Algebra');
    const sheet = within(screen.getByRole('dialog'));
    expect(within(sheet.getByRole('list', { name: 'Subtopics, in order' })).getByText('Functions')).toBeInTheDocument();
    expect(sheet.getByText('Old')).toBeInTheDocument();
  });

  it('retires a topic after asking, sending only its subject, and it leaves the counts', async () => {
    await show();
    openTopic('Complex Numbers');
    const sheet = within(screen.getByRole('dialog'));
    fireEvent.click(sheet.getByRole('button', { name: 'Retire' }));
    expect(updateDynamicTOS).not.toHaveBeenCalled();
    fireEvent.click(sheet.getByRole('button', { name: 'Retire Complex Numbers' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Retired Complex Numbers.'));
    expect(updateDynamicTOS).toHaveBeenCalledWith({ Mathematics: ['Algebra', 'Trigonometry', 'Vector Analysis'] });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(items('Algebra')).toHaveValue(5);
    // Not an unsaved change: the server already dropped it.
    expect(save()).toBeDisabled();
  });

  it('adds a topic to the subject, with no count, and refuses one it has', async () => {
    await show();
    fireEvent.change(screen.getByLabelText(/Add a topic/), { target: { value: 'algebra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Math already has algebra.'));
    expect(updateDynamicTOS).not.toHaveBeenCalled();

    responses['/api/admin/subtopics'] = { ...SUBS, topics: [...TOPICS, { id: 'new', subject: 'Mathematics', name: 'Set Theory', sortOrder: 5 }] };
    fireEvent.change(screen.getByLabelText(/Add a topic/), { target: { value: 'Set Theory' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await within(screen.getByRole('region', { name: 'No count' })).findByText('Set Theory');
    expect(updateDynamicTOS).toHaveBeenCalledWith({ Mathematics: ['Algebra', 'Complex Numbers', 'Trigonometry', 'Vector Analysis', 'Set Theory'] });
  });

  it('resets to PRC’s table after asking, and only once there’s something to reset', async () => {
    await show();
    expect(screen.getByRole('button', { name: 'Reset to PRC’s table' })).toBeDisabled();
    document.body.innerHTML = '';
    responses['/api/config/board-blueprint'] = { ...BOARD, custom: true };
    await show();
    fireEvent.click(screen.getByRole('button', { name: 'Reset to PRC’s table' }));
    responses['/api/admin/board-blueprint'] = BOARD;
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset all subjects' }));
    await waitFor(() => expect(lastCall('DELETE')?.[0]).toBe('/api/admin/board-blueprint'));
    expect(await screen.findByText('Using PRC’s table (2024).')).toBeInTheDocument();
  });

  it('follows the subject', async () => {
    await show();
    fireEvent.click(screen.getByRole('radio', { name: 'EE' }));
    expect(items('Electromagnetism')).toHaveValue(100);
    expect(screen.queryByRole('region', { name: 'No count' })).not.toBeInTheDocument();
  });

  it('offers another try when it can’t load', async () => {
    apiRequest.mockImplementationOnce(async () => { throw new Error('Server trouble'); });
    render(<SyllabusAdmin />);
    expect(await screen.findByText('Server trouble')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(await screen.findByRole('list', { name: 'Math board counts' })).toBeInTheDocument();
  });
});
