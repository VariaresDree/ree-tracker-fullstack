// src/features/assigned-exams/reach.test.jsx
//
// Getting assigned exams in front of learners and the results out to the
// reviewer: Today's line, and the results as CSV.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { apiRequest } from '../../services/dbQueries';
import NewExamLink from './NewExamLink';
import { __resetAssignedExamList } from './assignedExamsApi';
import { examResultsCsv, resultsFileName } from './admin/resultsCsv';

vi.mock('../../services/dbQueries', () => ({ apiRequest: vi.fn() }));

const exam = (over = {}) => ({ id: 'x1', title: 'EE prelim', availability: 'open', mine: null, ...over });
const renderLink = () => render(<MemoryRouter><NewExamLink /></MemoryRouter>);

beforeEach(() => {
  __resetAssignedExamList();
  vi.clearAllMocks();
});

describe('Today’s new-exam line', () => {
  it('names the one new exam and links to Exams › Assigned', async () => {
    apiRequest.mockResolvedValue({ items: [exam(), exam({ id: 'x2', mine: { attempts: 1 } })] });
    renderLink();
    const link = await screen.findByRole('link', { name: 'New exam: EE prelim' });
    expect(link).toHaveAttribute('href', '/exams?tab=assigned');
  });

  it('counts several, leaving out ones that are locked, not open yet or closed', async () => {
    apiRequest.mockResolvedValue({ items: [exam(), exam({ id: 'b' }), exam({ id: 'c', availability: 'locked' }), exam({ id: 'd', availability: 'upcoming' }), exam({ id: 'e', availability: 'closed' })] });
    renderLink();
    expect(await screen.findByRole('link', { name: '2 new exams from your reviewer' })).toBeInTheDocument();
  });

  it('says nothing when there’s nothing new, or offline', async () => {
    apiRequest.mockResolvedValueOnce({ items: [exam({ mine: { attempts: 1 } })] });
    const { unmount } = renderLink();
    await vi.waitFor(() => expect(apiRequest).toHaveBeenCalled());
    expect(screen.queryByRole('link')).toBeNull();
    unmount();

    __resetAssignedExamList();
    apiRequest.mockRejectedValueOnce(new Error('[OFFLINE]'));
    renderLink();
    await vi.waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('results as CSV', () => {
  const data = {
    exam: { title: 'EE prelim, week 3' },
    learners: [
      { displayName: 'Ana', first: 40, best: 100, attempts: 3, last: '2026-11-23T06:05:00Z', firstMode: 'BOARD_SIM' },
      { displayName: '=cmd', first: 90, best: 90, attempts: 1, last: '2026-11-21T00:00:00Z', firstMode: 'BATTLE' },
    ],
    items: [
      { questionId: 'q5', pct: 0, correct: 0, answered: 3, question: { text: 'Slip, "s", of a motor', subject: 'EE', subtopic: 'Machinery 1' } },
      { questionId: 'q9', pct: 100, correct: 1, answered: 1, question: null },
    ],
  };

  it('lists the learners, then the questions hardest first, quoted and formula-safe', () => {
    const lines = examResultsCsv(data).split('\r\n');
    expect(lines[0]).toBe('"EE prelim, week 3"');
    expect(lines[1]).toBe('Learner,First try %,Best %,Tries,Last taken (Manila),First taken');
    expect(lines[2]).toBe('Ana,40,100,3,2026-11-23 14:05,Alone');
    // A name a spreadsheet would run as a formula is kept as text.
    expect(lines[3]).toBe("'=cmd,90,90,1,2026-11-21 08:00,In a battle");
    expect(lines[4]).toBe('');
    expect(lines[6]).toBe('"Slip, ""s"", of a motor",EE,Machinery 1,0,0,3,q5');
    expect(lines[7]).toBe('(deleted from the bank),,,100,1,1,q9');
  });

  it('names the file after the exam', () => {
    expect(resultsFileName({ title: 'EE prelim, week 3: circuits!' })).toBe('EE-prelim-week-3-circuits-results.csv');
    expect(resultsFileName({ title: '¿¡' })).toBe('exam-results.csv');
  });
});
