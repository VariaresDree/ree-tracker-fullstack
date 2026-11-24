// src/features/assigned-exams/admin/ExamBuilder.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { fetchPaginatedQuestions, fetchVaultQuestions, apiRequest } from '../../../services/dbQueries';
import ExamBuilder from './ExamBuilder';
import { availabilityLine, byAvailability, examLength, fromLocalInput, paceMinutes, subjectMix, toLocalInput } from '../examMath';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../../../services/dbQueries', () => ({
  fetchPaginatedQuestions: vi.fn(),
  fetchVaultQuestions: vi.fn(),
  apiRequest: vi.fn(),
}));
vi.mock('../../../store/useStore', () => ({
  useStore: (sel) => sel({ dynamicTOS: { EE: ['Electric Circuits 1', 'Power System Analysis'], Mathematics: ['Calculus 1'] } }),
}));
vi.mock('../../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../../quiz/ExplanationBody', () => ({ default: ({ text }) => <p>{text}</p> }));

const q = (id, over = {}) => ({
  id, subject: 'EE', subtopic: 'Electric Circuits 1', text: `Question ${id}`, options: ['1 A', '2 A', '3 A', '4 A'], answer: '2 A',
  fixedExplanation: `Because ${id}`, difficulty: 1.5, type: 'calculation', ...over,
});
const bank = Array.from({ length: 8 }, (_, i) => q(`b${i + 1}`));

const toolbar = () => screen.getByRole('region', { name: 'Save this exam' });
const pick = (id) => fireEvent.click(screen.getByRole('checkbox', { name: `Pick: Question ${id}` }));

beforeEach(() => {
  vi.clearAllMocks();
  fetchPaginatedQuestions.mockResolvedValue({ items: bank, nextOffset: null });
  fetchVaultQuestions.mockResolvedValue([]);
  apiRequest.mockImplementation(async (url, method, body) => ({ item: { id: 'x1', ...body } }));
});

describe('the exam rules', () => {
  it('times the paper at the board’s pace for each subject', () => {
    // EE is 6 h for 100 items (3.6 min each); Mathematics 5 h (3 min each).
    expect(paceMinutes([q('a'), q('b')])).toBe(7);
    expect(paceMinutes([q('a', { subject: 'Math' })])).toBe(3);
    expect(paceMinutes([])).toBe(1);
  });

  it('says an exam’s length the way people do', () => {
    expect(examLength(1320)).toBe('22 min');
    expect(examLength(7200)).toBe('2 h');
    expect(examLength(8640)).toBe('2 h 24 min');
  });

  it('turns a date field’s local time into an instant and back', () => {
    const iso = fromLocalInput('2026-11-28T08:00');
    expect(toLocalInput(iso)).toBe('2026-11-28T08:00');
    expect(fromLocalInput('')).toBeNull();
    expect(toLocalInput(null)).toBe('');
  });

  it('says when an exam can be taken, and lists open ones first', () => {
    expect(availabilityLine({ availability: 'open' })).toBeNull();
    expect(availabilityLine({ availability: 'open', closesAt: '2026-11-30T09:00:00Z' })).toMatch(/^Closes /);
    expect(availabilityLine({ availability: 'upcoming', opensAt: '2026-11-28T00:00:00Z' })).toMatch(/^Opens /);
    expect(availabilityLine({ availability: 'locked' })).toBe('Your reviewer has locked it for now.');
    expect(availabilityLine({ availability: 'closed' })).toBe('Closed');
    const sorted = ['closed', 'locked', 'open', 'upcoming'].map((availability) => ({ availability })).sort(byAvailability);
    expect(sorted.map((e) => e.availability)).toEqual(['open', 'upcoming', 'locked', 'closed']);
  });

  it('counts each subject, under its short name', () => {
    expect(subjectMix([q('a'), q('b', { subject: 'Math' }), q('c')])).toBe('EE 2 · Math 1');
  });
});

describe('ExamBuilder', () => {
  it('lists the bank and puts ticked questions in the exam', async () => {
    render(<ExamBuilder onDone={vi.fn()} />);
    await screen.findByText('Question b1');
    expect(within(toolbar()).getByText(/0 picked · up to 300/)).toBeInTheDocument();

    pick('b1');
    pick('b2');
    expect(within(toolbar()).getByText(/2 picked/)).toBeInTheDocument();
    const exam = screen.getByRole('region', { name: 'Your exam' });
    expect(within(exam).getAllByRole('listitem')).toHaveLength(2);
    expect(within(exam).getByText('EE 2')).toBeInTheDocument();

    pick('b1');
    expect(within(toolbar()).getByText(/1 picked/)).toBeInTheDocument();
  });

  it('shows a question’s choices, its key and its explanation on request', async () => {
    render(<ExamBuilder onDone={vi.fn()} />);
    await screen.findByText('Question b1');
    const row = screen.getByText('Question b1').closest('li');
    fireEvent.click(within(row).getByRole('button', { name: 'Show choices' }));
    expect(within(row).getByText('Key').closest('li')).toHaveTextContent('2 A');
    expect(within(row).getByText('Because b1')).toBeInTheDocument();
  });

  it('won’t save with no questions or no title', async () => {
    render(<ExamBuilder onDone={vi.fn()} />);
    await screen.findByText('Question b1');
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Publish' }));
    expect(toast.error).toHaveBeenCalledWith('Give the exam a title.');
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'EE prelim' } });
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Publish' }));
    expect(toast.error).toHaveBeenLastCalledWith('Pick at least one question.');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('adds questions at random from the filter, skipping ones already picked', async () => {
    fetchVaultQuestions.mockResolvedValue([q('b1'), q('r1'), q('r2')]);
    render(<ExamBuilder onDone={vi.fn()} />);
    await screen.findByText('Question b1');
    pick('b1');
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'EE' } });
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'Power System Analysis' } });
    fireEvent.change(screen.getByLabelText('At random'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: /Add 25 at random/ }));
    await waitFor(() => expect(within(toolbar()).getByText(/3 picked/)).toBeInTheDocument());
    expect(fetchVaultQuestions).toHaveBeenCalledWith('EE', 'Power System Analysis', 75, 'random');
    expect(toast.success).toHaveBeenCalledWith('Added 2 at random.');
  });

  it('saves a draft with the questions, the title and the time at the board’s pace', async () => {
    const onDone = vi.fn();
    render(<ExamBuilder onDone={onDone} />);
    await screen.findByText('Question b1');
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: '  EE prelim  ' } });
    ['b1', 'b2', 'b3', 'b4', 'b5'].forEach(pick);
    expect(screen.getByLabelText(/Time \(minutes\)/)).toHaveValue(18); // 5 × 3.6 min
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(apiRequest).toHaveBeenCalledWith('/api/admin/assigned-exams', 'POST', {
      title: 'EE prelim', description: null, questionIds: ['b1', 'b2', 'b3', 'b4', 'b5'], timeLimitSecs: 1080, status: 'draft', kind: 'exam', opensAt: null, closesAt: null,
    }, expect.anything());
    expect(toast.success).toHaveBeenCalledWith('Draft saved.');
  });

  it('sends the dates it opens and closes, and won’t close before it opens', async () => {
    render(<ExamBuilder onDone={vi.fn()} />);
    await screen.findByText('Question b1');
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Scheduled' } });
    ['b1', 'b2', 'b3', 'b4', 'b5'].forEach(pick);
    fireEvent.change(screen.getByLabelText('Opens'), { target: { value: '2026-11-28T08:00' } });
    fireEvent.change(screen.getByLabelText('Closes'), { target: { value: '2026-11-28T07:00' } });
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Publish' }));
    expect(toast.error).toHaveBeenLastCalledWith('It has to close after it opens.');
    expect(apiRequest).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Closes'), { target: { value: '2026-11-30T17:00' } });
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    expect(apiRequest.mock.calls[0][2]).toMatchObject({ opensAt: fromLocalInput('2026-11-28T08:00'), closesAt: fromLocalInput('2026-11-30T17:00') });
  });

  it('saves the kind of set the admin picks', async () => {
    render(<ExamBuilder onDone={vi.fn()} />);
    await screen.findByText('Question b1');
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Trig problems' } });
    pick('b1');
    fireEvent.click(screen.getByRole('radio', { name: 'Problem set' }));
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    expect(apiRequest.mock.calls[0][2]).toMatchObject({ kind: 'problem-set' });
  });

  it('keeps the time the admin set', async () => {
    render(<ExamBuilder onDone={vi.fn()} />);
    await screen.findByText('Question b1');
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Quick five' } });
    ['b1', 'b2', 'b3', 'b4', 'b5'].forEach(pick);
    fireEvent.change(screen.getByLabelText(/Time \(minutes\)/), { target: { value: '10' } });
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    expect(apiRequest.mock.calls[0][2]).toMatchObject({ timeLimitSecs: 600, status: 'published' });
  });

  it('opens a saved exam, says which questions left the bank, and saves it in place', async () => {
    apiRequest.mockImplementation(async (url, method, body) => (method === 'GET'
      ? { item: { id: 'x1', title: 'Saved', description: 'Week 3', timeLimitSecs: 1800, status: 'published', questions: [q('s1'), q('s2'), q('s3'), q('s4'), q('s5')], missing: 2, takers: 6 } }
      : { item: { id: 'x1', ...body } }));
    const onDone = vi.fn();
    render(<ExamBuilder examId="x1" onDone={onDone} />);
    expect(await screen.findByDisplayValue('Saved')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('2 questions were deleted from the bank');
    expect(screen.getByText(/Changes apply to new sittings/)).toHaveTextContent('6 took it');
    expect(screen.getByLabelText(/Time \(minutes\)/)).toHaveValue(30);
    expect(within(toolbar()).queryByRole('button', { name: 'Save draft' })).toBeNull();
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(apiRequest).toHaveBeenLastCalledWith('/api/admin/assigned-exams/x1', 'PUT', expect.objectContaining({
      questionIds: ['s1', 's2', 's3', 's4', 's5'], status: 'published', description: 'Week 3',
    }), expect.anything());
  });
});
