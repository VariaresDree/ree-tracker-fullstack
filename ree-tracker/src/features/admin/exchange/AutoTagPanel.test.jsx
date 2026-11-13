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
    expect(screen.getByText('15,000 not looked at yet · 3 to review')).toBeInTheDocument();
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
    await waitFor(() => expect(screen.getByText('15,000 not looked at yet · 1 to review')).toBeInTheDocument());
    expect(screen.getByText('1,202 of 17,185 questions tagged')).toBeInTheDocument();
  });
});
