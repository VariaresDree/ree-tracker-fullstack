import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// Admin › Question bank › Subtopics › In the background: the switch, the
// bank's progress, and the AI's unsure picks kept on the server.

const apiRequest = vi.fn();
vi.mock('../../../services/dbQueries', () => ({ apiRequest: (...a) => apiRequest(...a) }));
vi.mock('../../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: AutoTagPanel } = await import('./AutoTagPanel');

const STATUS = { enabled: false, running: false, callsPerRun: 3, batch: 50, total: 17185, tagged: 1200, toReview: 2, notAsked: 15000 };
const OPEN = {
  items: [
    { id: 'q1', topicId: 't1', subtopicId: 's-dc', guess: 'DC Circuits', text: 'A 12 V battery and a 4 ohm resistor' },
    { id: 'q2', topicId: 't1', subtopicId: null, guess: null, text: 'Thevenin of a bridge' },
  ],
  topics: [{ id: 't1', subject: 'EE', name: 'Circuits', subtopics: [{ id: 's-ac', name: 'AC Circuits' }, { id: 's-dc', name: 'DC Circuits' }] }],
};

beforeEach(() => {
  apiRequest.mockReset();
  toast.success.mockClear();
  apiRequest.mockImplementation(async (url, method) => {
    if (url.startsWith('/api/questions/auto-tag-status')) return STATUS;
    if (url.startsWith('/api/questions/tag-suggestions?')) return OPEN;
    if (url === '/api/questions/tag-suggestions/resolve') return { success: true, saved: 1, skipped: 0, refused: [] };
    if (method === 'PUT') return { success: true };
    return {};
  });
});

describe('Tagging in the background', () => {
  it('shows how far the bank has got and turns the run on', async () => {
    render(<AutoTagPanel />);
    expect(await screen.findByText('1,200 of 17,185 questions tagged')).toBeInTheDocument();
    expect(screen.getByText('15,000 not looked at yet · 2 to review')).toBeInTheDocument();
    expect(screen.getByText(/about 150 questions an hour/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'On' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/config/flags/subtopic-autotag', 'PUT', expect.objectContaining({ enabled: true })));
    expect(await screen.findByRole('radio', { name: 'On' })).toBeChecked();
  });

  it('lists the unsure picks with their topic’s subtopics; Save tags one, None fits closes one', async () => {
    render(<AutoTagPanel />);
    const list = await screen.findByRole('region', { name: 'To review' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('AI: DC Circuits · not sure')).toBeInTheDocument();
    expect(within(rows[0]).getByRole('combobox')).toHaveValue('s-dc');
    expect(within(rows[1]).getByText('AI: none of these')).toBeInTheDocument();

    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/questions/tag-suggestions/resolve', 'POST', { items: [{ id: 'q1', subtopicId: 's-dc' }] }, expect.any(Object)));
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1));

    fireEvent.click(within(list).getByRole('button', { name: 'None fits' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/questions/tag-suggestions/resolve', 'POST', { items: [{ id: 'q2', subtopicId: null }] }, expect.any(Object)));
  });
});
