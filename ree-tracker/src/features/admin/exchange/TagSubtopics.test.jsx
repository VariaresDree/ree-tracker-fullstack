import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const apiRequest = vi.fn();
vi.mock('../../../services/dbQueries', () => ({ apiRequest: (...a) => apiRequest(...a) }));
const callAITask = vi.fn();
vi.mock('../../../services/geminiApi', () => ({
  callAITask: (...a) => callAITask(...a),
  parseAiJson: (t) => JSON.parse(t),
}));
vi.mock('../../exam-export/deliver', () => ({ copyText: vi.fn(async () => true) }));
vi.mock('../../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../../../components/AiStatusNote', () => ({ default: () => null }));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() });
vi.mock('react-hot-toast', () => ({ default: toast }));

const { default: TagSubtopics } = await import('./TagSubtopics');

const subtopics = [{ id: 's-ac', name: 'AC Circuits' }, { id: 's-dc', name: 'DC Circuits' }];
const topic = { id: 't1', subject: 'EE', name: 'Circuits', subtopics: 2, total: 3, tagged: 0 };
const items = [
  { id: 'q1', text: 'Stem one', options: [], subtopicId: null },
  { id: 'q2', text: 'Stem two', options: [], subtopicId: null },
  { id: 'q3', text: 'Stem three', options: [], subtopicId: null },
];

let pages;
let saved;
beforeEach(() => {
  vi.clearAllMocks();
  saved = [];
  pages = [{ topic: { id: 't1', subject: 'EE', name: 'Circuits' }, subtopics, items, total: 3, tagged: 0 }];
  apiRequest.mockImplementation(async (url, method, body) => {
    if (url.startsWith('/api/questions/tagging-overview')) return { topics: [topic] };
    if (url.startsWith('/api/questions/for-tagging')) {
      const offset = Number(new URL(url, 'http://x').searchParams.get('offset'));
      const page = pages.shift() || { topic: { id: 't1', subject: 'EE', name: 'Circuits' }, subtopics, items: [], total: 3, tagged: 1 };
      return { ...page, offset };
    }
    if (url === '/api/questions/tag-bulk') { saved.push(body.items); return { success: true, saved: body.items.length, refused: [] }; }
    if (url === '/api/questions/tag-clear') return { success: true, cleared: 1 };
    throw new Error(url);
  });
});

async function openTopic() {
  render(<TagSubtopics />);
  const select = await screen.findByLabelText('Topic');
  await screen.findByRole('option', { name: /Circuits · 0 of 3 tagged/ });
  fireEvent.change(select, { target: { value: 't1' } });
}

describe('Tag subtopics', () => {
  it('saves the sure picks and lists the rest for review', async () => {
    callAITask.mockResolvedValue({ text: JSON.stringify({ tags: [
      { n: 1, subtopic: 'AC Circuits', sure: true },
      { n: 2, subtopic: 'DC Circuits', sure: false },
      { n: 3, subtopic: 'none', sure: false },
    ] }) });
    await openTopic();
    fireEvent.click(screen.getByRole('button', { name: /Tag with the in-app AI/ }));
    await screen.findByText('To review · 2');
    expect(saved).toEqual([[{ id: 'q1', subtopicId: 's-ac' }]]);
    expect(callAITask.mock.calls[0][0]).toBe('classify');
    expect(screen.getByText('AI: DC Circuits · not sure')).toBeInTheDocument();
    expect(screen.getByText('AI: none of these')).toBeInTheDocument();
    // A short page is the topic's last.
    expect(apiRequest.mock.calls.filter(([u]) => u.startsWith('/api/questions/for-tagging'))).toHaveLength(1);
  });

  it('a review pick saves that one question', async () => {
    callAITask.mockResolvedValue({ text: JSON.stringify({ tags: [{ n: 1, subtopic: 'DC Circuits', sure: false }] }) });
    pages[0].items = items.slice(0, 1);
    await openTopic();
    fireEvent.click(screen.getByRole('button', { name: /Tag with the in-app AI/ }));
    await screen.findByText('To review · 1');
    fireEvent.change(screen.getByLabelText('Subtopic'), { target: { value: 's-ac' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByText(/To review/)).not.toBeInTheDocument());
    expect(saved).toEqual([[{ id: 'q1', subtopicId: 's-ac' }]]);
  });

  it('the next batch starts after the questions left untagged', async () => {
    pages = [
      { topic: { id: 't1', subject: 'EE', name: 'Circuits' }, subtopics, items: Array.from({ length: 50 }, (_, i) => ({ id: `q${i}`, text: `S${i}`, options: [] })), total: 60, tagged: 0 },
    ];
    // Sure about all but the first two.
    callAITask.mockResolvedValueOnce({ text: JSON.stringify({ tags: Array.from({ length: 50 }, (_, i) => ({ n: i + 1, subtopic: 'AC Circuits', sure: i >= 2 })) }) });
    await openTopic();
    fireEvent.click(screen.getByRole('button', { name: /Tag with the in-app AI/ }));
    await screen.findByText('To review · 2');
    const urls = apiRequest.mock.calls.map(([u]) => u).filter((u) => u.startsWith('/api/questions/for-tagging'));
    expect(urls[0]).toContain('offset=0');
    expect(urls[1]).toContain('offset=2');
  });

  it('clearing asks once more first', async () => {
    apiRequest.mockImplementationOnce(async () => ({ topics: [{ ...topic, tagged: 2 }] }));
    render(<TagSubtopics />);
    const select = await screen.findByLabelText('Topic');
    await screen.findByRole('option', { name: /2 of 3 tagged/ });
    fireEvent.change(select, { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('button', { name: /Clear this topic/ }));
    expect(apiRequest).not.toHaveBeenCalledWith('/api/questions/tag-clear', expect.anything(), expect.anything(), expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Clear 2 tags' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/api/questions/tag-clear', 'POST', { topicId: 't1' }, expect.objectContaining({ idempotencyKey: expect.any(String) })));
  });

  it('another AI: copy a prompt, paste the reply, save the sure ones', async () => {
    await openTopic();
    fireEvent.click(screen.getByRole('button', { name: 'Use another AI instead' }));
    const prompt = await screen.findByLabelText('Prompt and questions');
    expect(prompt.value).toContain('1. Stem one');
    fireEvent.change(screen.getByLabelText(/Its reply/), { target: { value: JSON.stringify({ tags: [{ n: 2, subtopic: 'DC Circuits', sure: true }] }) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save the sure ones' }));
    await screen.findByText('To review · 2');
    expect(saved).toEqual([[{ id: 'q2', subtopicId: 's-dc' }]]);
    expect(callAITask).not.toHaveBeenCalled();
  });
});
