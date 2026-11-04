// src/features/quiz-launcher/QuizLauncherTab.test.jsx
//
// Real quiz files through the real UI: the file input, the parser, the setup
// sheet, both modes, results and resuming. Only IndexedDB is swapped, for a Map
// that outlives a remount the way the device does.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import QuizLauncherTab from './QuizLauncherTab';
import QuizRunPage from './QuizRunPage';
import { __resetQuizSession } from './quizSession';
import { getRun, saveRun } from './quizStore';
import * as idb from 'idb-keyval';

vi.mock('idb-keyval', () => {
  const data = new Map();
  return {
    __data: data,
    createStore: () => 'store',
    get: vi.fn(async (k) => data.get(k)),
    set: vi.fn(async (k, v) => { data.set(k, v); }),
    del: vi.fn(async (k) => { data.delete(k); }),
    keys: vi.fn(async () => [...data.keys()]),
    getMany: vi.fn(async (ks) => ks.map((k) => data.get(k))),
  };
});

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

// The tab and the run page, as App routes them.
const renderLauncher = (at = '/library') => render(
  <MemoryRouter initialEntries={[at]}>
    <Where />
    <Routes>
      <Route path="/library" element={<QuizLauncherTab />} />
      <Route path="/library/quiz" element={<QuizRunPage />} />
    </Routes>
  </MemoryRouter>,
);

const reloadApp = (view) => {
  view.unmount();
  __resetQuizSession();
  return renderLauncher();
};

beforeEach(() => {
  idb.__data.clear();
  idb.set.mockClear();
  localStorage.clear();
  __resetQuizSession();
});

// Just the answer text of an option row, not its letter or review notes.
const optionText = (radio) => radio.querySelector('.flex-1')?.textContent.trim();
const fixture = (name) => new File(
  [readFileSync(join(process.cwd(), 'src/features/quiz-launcher/__fixtures__', name))],
  name,
  { type: 'application/octet-stream' },
);
const addFile = (file) => fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
const addQuiz = async () => {
  addFile(fixture('ac-circuits.quiz'));
  await screen.findByText(/36 questions loaded/i);
};
const Q1 = /the total voltage in a series RL circuit/i;
const Q1_ANSWER = 'leads, between 0° to 90°';
// A choice's screen-reader note once it's been graded.
const REVEALED = /Correct answer|Your answer, correct/i;

const setUp = async ({ mode = 'Practice', extra } = {}) => {
  await addQuiz();
  fireEvent.click(screen.getByRole('button', { name: 'Start ac-circuits.quiz' }));
  const sheet = await screen.findByRole('dialog');
  fireEvent.click(within(sheet).getByRole('radio', { name: mode }));
  extra?.(sheet);
  fireEvent.click(within(sheet).getByRole('button', { name: 'Start quiz' }));
  await screen.findByText(Q1);
};
const pick = (text) => fireEvent.click(screen.getByText(text));
const choices = () => within(screen.getByRole('radiogroup', { name: 'Answer choices' })).getAllByRole('radio');
const pickedText = () => optionText(choices().find((r) => r.getAttribute('aria-checked') === 'true'));
const wrongChoice = () => choices().map(optionText).find((t) => t !== Q1_ANSWER);
const submitExam = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Submit exam' }));
  const dialog = await screen.findByRole('dialog', { name: 'Submit this exam?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Submit exam' }));
  await screen.findByText(/\/ 36 correct/);
};

describe('Your quiz files', () => {
  it('reads a real file and says how many questions it has', async () => {
    renderLauncher();
    await addQuiz();
    expect(screen.queryByText(/skipped/i)).not.toBeInTheDocument();
  });

  it('are still there after a reload, on the device', async () => {
    const view = renderLauncher();
    await addQuiz();
    reloadApp(view);
    expect(await screen.findByText(/36 questions loaded/i)).toBeInTheDocument();
  });

  it('adding the same file twice is one quiz', async () => {
    renderLauncher();
    await addQuiz();
    addFile(fixture('ac-circuits.quiz'));
    await waitFor(() => expect(idb.set).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByText(/36 questions loaded/i)).toHaveLength(1));
  });

  it('a bad file gets a plain message and doesn’t block the next', async () => {
    renderLauncher();
    addFile(new File(['not a zip at all'], 'notes.quiz', { type: 'text/plain' }));
    expect(await screen.findByText(/doesn't look like a valid quiz file/i)).toBeInTheDocument();
    addFile(fixture('alternators.quiz'));
    expect(await screen.findByText(/49 questions loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/doesn't look like a valid quiz file/i)).toBeInTheDocument();
  });

  it('a file that is not a quiz is named, not silently ignored', () => {
    renderLauncher();
    addFile(new File(['x'], 'notes.pdf'));
    expect(screen.getByRole('alert')).toHaveTextContent('notes.pdf isn’t a quiz file');
  });

  it('delete asks first, then it’s gone from the device', async () => {
    const view = renderLauncher();
    await addQuiz();
    fireEvent.click(screen.getByRole('button', { name: 'Delete ac-circuits.quiz' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Delete this quiz?' })).getByRole('button', { name: 'Keep it' }));
    expect(screen.getByText(/36 questions loaded/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete ac-circuits.quiz' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Delete this quiz?' })).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText(/36 questions loaded/i)).toBeNull());
    await waitFor(() => expect(idb.__data.size).toBe(0));
    reloadApp(view);
    expect(await screen.findByText('No quizzes yet')).toBeInTheDocument();
  });

  it('a browser that won’t store anything keeps it for now, and says so', async () => {
    idb.set.mockRejectedValue(new Error('blocked'));
    try {
      renderLauncher();
      await addQuiz();
      expect(await screen.findByText(/goes when you close the tab/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Start ac-circuits.quiz' }));
      fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Start quiz' }));
      expect(await screen.findByText(Q1)).toBeInTheDocument();
    } finally {
      idb.set.mockImplementation(async (k, v) => { idb.__data.set(k, v); });
    }
  });
});

describe('The setup sheet', () => {
  it('offers a time limit only for an exam, and only counts the file can fill', async () => {
    renderLauncher();
    await addQuiz();
    fireEvent.click(screen.getByRole('button', { name: 'Start ac-circuits.quiz' }));
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).queryByRole('radiogroup', { name: 'Time limit' })).toBeNull();
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Exam' }));
    expect(within(sheet).getByRole('radiogroup', { name: 'Time limit' })).toBeInTheDocument();
    expect(within(sheet).getByRole('radio', { name: 'All 36' })).toBeInTheDocument();
    expect(within(sheet).getByRole('radio', { name: '20' })).toBeInTheDocument();
    expect(within(sheet).queryByRole('radio', { name: '50' })).toBeNull();
    fireEvent.click(within(sheet).getByRole('radio', { name: '2 min' }));
    expect(within(sheet).getByText(/36 questions · exam · 72 min/)).toBeInTheDocument();
  });

  it('remembers the last setup', async () => {
    const view = renderLauncher();
    await addQuiz();
    fireEvent.click(screen.getByRole('button', { name: 'Start ac-circuits.quiz' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('radio', { name: 'Exam' }));
    reloadApp(view);
    await screen.findByText(/36 questions loaded/i);
    fireEvent.click(screen.getByRole('button', { name: 'Start ac-circuits.quiz' }));
    expect(within(await screen.findByRole('dialog')).getByRole('radio', { name: 'Exam' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Back closes it', async () => {
    renderLauncher();
    await addQuiz();
    fireEvent.click(screen.getByRole('button', { name: 'Start ac-circuits.quiz' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByTestId('where')).toHaveTextContent('/library');
  });

  it('a limited count takes that many', async () => {
    renderLauncher();
    await addQuiz();
    fireEvent.click(screen.getByRole('button', { name: 'Start ac-circuits.quiz' }));
    const sheet = await screen.findByRole('dialog');
    fireEvent.click(within(sheet).getByRole('radio', { name: '10' }));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Start quiz' }));
    await screen.findByRole('radiogroup', { name: 'Answer choices' });
    const key = await waitFor(() => {
      const k = [...idb.__data.keys()].find((x) => x.includes(':quiz:run:'));
      expect(k).toBeTruthy();
      return k;
    });
    const ids = idb.__data.get(key).items.map((i) => i.id);
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
  });
});

describe('Practice mode', () => {
  it('shows the answer right after a pick, with a running score, and locks it', async () => {
    renderLauncher();
    await setUp();
    expect(screen.queryByText(REVEALED)).toBeNull();
    pick(Q1_ANSWER);
    expect(await screen.findAllByText(REVEALED)).not.toHaveLength(0);
    expect(screen.getByText(/\/1 correct/)).toHaveTextContent('1/1 correct');
    const other = wrongChoice();
    pick(other);
    expect(pickedText()).toBe(Q1_ANSWER);
  });

  it('a wrong pick shows the right one too, and the score stays honest', async () => {
    renderLauncher();
    await setUp();
    pick(wrongChoice());
    expect(await screen.findAllByText(REVEALED)).not.toHaveLength(0);
    expect(screen.getByText(/\/1 correct/)).toHaveTextContent('0/1 correct');
  });
});

describe('Exam mode', () => {
  it('reveals nothing until the whole set is in, and answers can change', async () => {
    renderLauncher();
    await setUp({ mode: 'Exam' });
    const other = wrongChoice();
    pick(other);
    expect(screen.queryByText(REVEALED)).toBeNull();
    expect(screen.queryByText(/\/1 correct/)).toBeNull();
    pick(Q1_ANSWER);
    expect(pickedText()).toBe(Q1_ANSWER);
    expect(screen.queryByText(REVEALED)).toBeNull();
  });

  it('submits from any item, then shows the score and notes', async () => {
    renderLauncher();
    await setUp({ mode: 'Exam' });
    pick(Q1_ANSWER);
    await submitExam();
    expect(screen.getByText(/1 \/ 36 correct/)).toBeInTheDocument();
    expect(screen.getByText(/doesn’t count toward your progress/)).toBeInTheDocument();
    expect(screen.getByText(/had a duplicate choice in the file/)).toBeInTheDocument();
  });

  it('review keeps the order you answered in, with your pick', async () => {
    renderLauncher();
    await setUp({ mode: 'Exam' });
    const order = choices().map(optionText);
    const wrong = wrongChoice();
    pick(wrong);
    await submitExam();
    expect(choices().map(optionText)).toEqual(order);
    expect(pickedText()).toBe(wrong);
  });

  it('the filters count wrong and blank apart', async () => {
    renderLauncher();
    await setUp({ mode: 'Exam' });
    pick(wrongChoice());
    await submitExam();
    expect(screen.getByRole('radio', { name: 'Wrong 1' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Blank 35' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Blank 35' }));
    expect(screen.getAllByText('Left blank').length).toBeGreaterThan(0);
  });

  it('Retry missed runs only those, and the attempt shows on the row', async () => {
    renderLauncher();
    await setUp({ mode: 'Exam' });
    pick(Q1_ANSWER);
    await submitExam();
    fireEvent.click(screen.getByRole('button', { name: /Retry missed \(35\)/ }));
    await screen.findByRole('button', { name: 'Submit exam' });
    await waitFor(() => {
      const run = [...idb.__data.entries()].find(([k]) => k.includes(':quiz:run:'))[1];
      expect(run.items).toHaveLength(35);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(await screen.findByText('Scored 3%')).toBeInTheDocument();
  });
});

describe('Leaving and coming back', () => {
  it('Leave needs no confirmation and the row says how far you got', async () => {
    renderLauncher();
    await setUp({ mode: 'Exam' });
    pick(Q1_ANSWER);
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(await screen.findByText('Unfinished: 1 of 36 answered')).toBeInTheDocument();
  });

  it('a reload resumes with the same choices in the same order, and the pick', async () => {
    const view = renderLauncher();
    await setUp({ mode: 'Exam' });
    const order = choices().map(optionText);
    pick(Q1_ANSWER);
    await waitFor(() => {
      const run = [...idb.__data.entries()].find(([k]) => k.includes(':quiz:run:'))[1];
      expect(Object.keys(run.answers)).toHaveLength(1);
    });
    reloadApp(view);
    fireEvent.click(await screen.findByRole('button', { name: /Resume/ }));
    await screen.findByText(Q1);
    expect(choices().map(optionText)).toEqual(order);
    expect(pickedText()).toBe(Q1_ANSWER);
  });

  it('a deadline that passed while away submits on return, and counts once', async () => {
    const view = renderLauncher();
    await setUp({ mode: 'Exam', extra: (sheet) => fireEvent.click(within(sheet).getByRole('radio', { name: '1 min' })) });
    pick(Q1_ANSWER);
    const key = await waitFor(() => {
      const found = [...idb.__data.entries()].find(([k, v]) => k.includes(':quiz:run:') && Object.keys(v.answers).length === 1);
      expect(found).toBeTruthy();
      return found[0];
    });
    const id = key.split(':').pop();
    view.unmount();
    __resetQuizSession();
    const run = await getRun(undefined, id);
    await saveRun(undefined, id, { ...run, deadline: Date.now() - 1000 });
    renderLauncher(`/library/quiz?id=${id}`);
    expect(await screen.findByText(/Time ran out/)).toBeInTheDocument();
    await waitFor(() => expect(idb.__data.get(`local:quiz:attempts:${id}`)).toHaveLength(1));
    const after = await getRun(undefined, id);
    expect(after.finished).toBe(true);
  });

  it('results come back after a reload until you leave them', async () => {
    const view = renderLauncher();
    await setUp({ mode: 'Exam' });
    pick(Q1_ANSWER);
    await submitExam();
    const id = [...idb.__data.keys()].find((k) => k.includes(':quiz:run:')).split(':').pop();
    view.unmount();
    renderLauncher(`/library/quiz?id=${id}`);
    expect(await screen.findByText(/1 \/ 36 correct/)).toBeInTheDocument();
    expect(idb.__data.get(`local:quiz:attempts:${id}`)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Back to quizzes/ }));
    expect(await screen.findByText('Scored 3%')).toBeInTheDocument();
    expect(idb.__data.has(`local:quiz:run:${id}`)).toBe(false);
  });

  it('the run page with no such quiz goes back to the list', async () => {
    renderLauncher('/library/quiz?id=nope');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/library$/));
  });

  it('with no id, too', async () => {
    renderLauncher('/library/quiz');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/library$/));
  });
});

describe('Keys in a run', () => {
  it('arrow keys on the page move between items, and M marks in an exam', async () => {
    renderLauncher();
    await setUp({ mode: 'Exam' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.queryByText(Q1)).toBeNull());
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(await screen.findByText(Q1)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'm' });
    fireEvent.click(screen.getByRole('button', { name: 'Submit exam' }));
    const dialog = await screen.findByRole('dialog', { name: 'Submit this exam?' });
    expect(within(dialog).getByText(/item is marked for review/)).toBeInTheDocument();
  });
});
