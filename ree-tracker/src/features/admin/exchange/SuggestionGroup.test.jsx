import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// One group of the review pile: ticked by default when the AI suggested a
// subtopic, untick the odd one out, tag the rest; with no suggestion, tick
// those that belong together and choose their subtopic.

const apiRequest = vi.fn();
vi.mock('../../../services/dbQueries', () => ({ apiRequest: (...a) => apiRequest(...a) }));
vi.mock('../../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: SuggestionGroup } = await import('./SuggestionGroup');

const TOPIC = { id: 't1', subtopics: [{ id: 's-ac', name: 'AC Circuits' }, { id: 's-dc', name: 'DC Circuits' }] };
const ITEMS = ['q1', 'q2', 'q3'].map((id, i) => ({ id, topicId: 't1', subtopicId: 's-dc', guess: 'DC Circuits', text: `Question ${i + 1}`, options: [] }));
const resolveCall = () => apiRequest.mock.calls.find(([url]) => url === '/api/questions/tag-suggestions/resolve');

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (url, method, body) => {
    if (url.startsWith('/api/questions/tag-suggestions?')) return { items: ITEMS };
    return { success: true, saved: body.items.filter((i) => i.subtopicId).length, refused: [] };
  });
});

describe('SuggestionGroup', () => {
  it('a suggestion starts all ticked; Tag sends only the ticked ones, with the chosen subtopic', async () => {
    const onResolved = vi.fn();
    render(<SuggestionGroup topic={TOPIC} group={{ subtopicId: 's-dc', count: 3 }} onResolved={onResolved} />);
    await screen.findByText('Question 3');
    expect(screen.getByRole('combobox')).toHaveValue('s-dc');
    fireEvent.click(screen.getByRole('checkbox', { name: /Include: Question 2/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Tag 2' }));
    await waitFor(() => expect(onResolved).toHaveBeenCalledWith({ resolved: 2, saved: 2 }));
    expect(resolveCall()[2]).toEqual({ items: [{ id: 'q1', subtopicId: 's-dc' }, { id: 'q3', subtopicId: 's-dc' }] });
    // The unticked one stays for later.
    expect(screen.getByText('Question 2')).toBeInTheDocument();
    expect(screen.queryByText('Question 1')).toBeNull();
  });

  it('None fits leaves the ticked ones untagged for good', async () => {
    render(<SuggestionGroup topic={TOPIC} group={{ subtopicId: 's-dc', count: 3 }} onResolved={() => {}} />);
    await screen.findByText('Question 1');
    fireEvent.click(screen.getByRole('button', { name: 'None fits for 3' }));
    await waitFor(() => expect(resolveCall()[2].items).toEqual(ITEMS.map((i) => ({ id: i.id, subtopicId: null }))));
  });

  it('with no suggestion nothing starts ticked and a subtopic must be chosen', async () => {
    render(<SuggestionGroup topic={TOPIC} group={{ subtopicId: null, count: 3 }} onResolved={() => {}} />);
    await screen.findByText('Question 1');
    expect(apiRequest).toHaveBeenCalledWith('/api/questions/tag-suggestions?topicId=t1&subtopicId=none', 'GET', null, expect.any(Object));
    expect(screen.getByRole('button', { name: 'Tag 0' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Include: Question 1/ }));
    expect(screen.getByRole('button', { name: 'Tag 1' })).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 's-ac' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tag 1' }));
    await waitFor(() => expect(resolveCall()[2]).toEqual({ items: [{ id: 'q1', subtopicId: 's-ac' }] }));
  });
});
