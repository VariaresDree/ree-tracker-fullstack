import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Admin › Question bank › Subtopics › In the background: the switch, the
// bank's progress, and the review pile in groups (2026-11-13).

const apiRequest = vi.fn();
vi.mock('../../../services/dbQueries', () => ({ apiRequest: (...a) => apiRequest(...a) }));
vi.mock('../../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: AutoTagPanel } = await import('./AutoTagPanel');

const STATUS = { enabled: false, running: false, callsPerRun: 3, batch: 50, total: 17185, tagged: 1200, toReview: 3, notAsked: 15000 };
const TOPIC = { id: 't1', subject: 'EE', name: 'Electric Circuits 1', subtopics: [{ id: 's-ac', name: 'AC Circuits' }, { id: 's-dc', name: 'DC Circuits' }] };
const GROUPS = { total: 3, topics: [{ ...TOPIC, count: 3, groups: [{ subtopicId: 's-dc', name: 'DC Circuits', count: 2 }, { subtopicId: null, name: null, count: 1 }] }] };
const ITEMS = [
  { id: 'q1', topicId: 't1', subtopicId: 's-dc', guess: 'DC Circuits', text: 'A 12 V battery and a 4 ohm resistor', options: [] },
  { id: 'q2', topicId: 't1', subtopicId: 's-dc', guess: 'DC Circuits', text: 'A 6 V cell', options: [] },
];

beforeEach(() => {
  apiRequest.mockReset();
  toast.success.mockClear();
  apiRequest.mockImplementation(async (url, method, body) => {
    if (url.startsWith('/api/questions/auto-tag-status')) return STATUS;
    if (url === '/api/questions/tag-suggestions/groups') return GROUPS;
    if (url.startsWith('/api/questions/tag-suggestions?')) return { items: ITEMS, topic: TOPIC };
    if (url === '/api/questions/tag-suggestions/resolve') return { success: true, saved: body.items.filter((i) => i.subtopicId).length, skipped: 0, refused: [] };
    if (method === 'PUT') return { success: true };
    return {};
  });
});

describe('Tagging in the background', () => {
  it('shows how far the bank has got and turns the run on', async () => {
    render(<AutoTagPanel />);
    expect(await screen.findByText('1,200 of 17,185 questions tagged')).toBeInTheDocument();
    expect(screen.getByText('15,000 not looked at yet · 0 saved to check · 3 to sort')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'On' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/config/flags/subtopic-autotag', 'PUT', expect.objectContaining({ enabled: true })));
  });

  it('lists the pile by topic and suggestion; a group opens to tag in one go and the counts follow', async () => {
    render(<AutoTagPanel />);
    fireEvent.click(await screen.findByRole('button', { name: /Electric Circuits 1 · 3/ }));
    expect(screen.getByRole('button', { name: /No suggestion/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /DC Circuits.*2 suggested/ }));
    await screen.findByText('A 6 V cell');
    expect(apiRequest).toHaveBeenCalledWith('/api/questions/tag-suggestions?topicId=t1&subtopicId=s-dc', 'GET', null, expect.any(Object));
    fireEvent.click(screen.getByRole('button', { name: 'Tag 2' }));
    await waitFor(() => expect(screen.getByText('15,000 not looked at yet · 0 saved to check · 1 to sort')).toBeInTheDocument());
    // The tagged total is read again from the server after a group is answered.
    expect(apiRequest.mock.calls.filter(([url]) => url.startsWith('/api/questions/auto-tag-status'))).toHaveLength(2);
  });

  // 2026-11-14: a pick that names a subtopic is saved without waiting, and listed to check.
  it('a group the AI already saved reads "saved, to check", and confirming takes it off both counts', async () => {
    const saved = { total: 3, saved: 2, topics: [{ ...TOPIC, count: 3, groups: [{ subtopicId: 's-dc', name: 'DC Circuits', count: 2, saved: 2 }, { subtopicId: null, name: null, count: 1, saved: 0 }] }] };
    const base = apiRequest.getMockImplementation();
    apiRequest.mockImplementation(async (url, ...rest) => {
      if (url === '/api/questions/tag-suggestions/groups') return saved;
      if (url.startsWith('/api/questions/tag-suggestions?')) return { items: ITEMS.map((i) => ({ ...i, saved: true })), topic: TOPIC };
      return base(url, ...rest);
    });
    render(<AutoTagPanel />);
    expect(await screen.findByText('15,000 not looked at yet · 2 saved to check · 1 to sort')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Electric Circuits 1 · 3/ }));
    fireEvent.click(screen.getByRole('button', { name: /DC Circuits.*2 saved, to check/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm 2' }));
    await waitFor(() => expect(screen.getByText('15,000 not looked at yet · 0 saved to check · 1 to sort')).toBeInTheDocument());
  });
});
