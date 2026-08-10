// src/features/quiz-launcher/QuizLauncherTab.test.jsx
//
// An end-to-end integration test through the REAL UI with a REAL sample
// file — not a mock. This exists specifically to close a verification gap:
// the parser is unit-tested thoroughly (caqParser.test.js), but that alone
// doesn't prove the UI is wired to it correctly (the file input actually
// reaches parseCaqArchive, loaded state actually renders, Start actually
// launches the runner with the right data, answers actually score). Live
// browser verification in a real signed-in session wasn't available in this
// environment, so this is the closest substitute: jsdom's File API is real
// enough to drive the exact code path a user's file picker/drop would.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import QuizLauncherTab from './QuizLauncherTab';

// Reads just the answer-text portion of an option row, not the whole button
// (which also carries the A/B/C/D letter and, in review mode, an sr-only
// "Correct answer"/"Incorrect" span) — see OptionRow in QuestionCard.jsx.
function optionText(radio) {
  return radio.querySelector('.flex-1')?.textContent.trim();
}

function loadFixtureAsFile(name) {
  const bytes = readFileSync(join(process.cwd(), 'src/features/quiz-launcher/__fixtures__', name));
  return new File([bytes], name, { type: 'application/octet-stream' });
}

describe('QuizLauncherTab — real file through the real UI', () => {
  it('loads a real .quiz file via the file input and reports the correct question count', async () => {
    render(<QuizLauncherTab />);
    const file = loadFixtureAsFile('ac-circuits.quiz');
    const input = document.querySelector('input[type="file"]');

    fireEvent.change(input, { target: { files: [file] } });

    // All 36 real records parse cleanly — the loaded-count message is exact,
    // and the UI correctly omits any "skipped" mention when nothing was
    // (a "0 skipped" label would be noise, not the '<>'-is-content trap this
    // suite is guarding against — that's covered at the parser level).
    await waitFor(() => expect(screen.getByText(/36 questions loaded/i)).toBeInTheDocument());
    expect(screen.queryByText(/skipped/i)).not.toBeInTheDocument();
  });

  it('launches a loaded quiz and renders the real question text with UTF-8 intact', async () => {
    render(<QuizLauncherTab />);
    const file = loadFixtureAsFile('ac-circuits.quiz');
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/36 questions loaded/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    // Exact real Q1 text from the source file, and the degree sign survives
    // the full pipeline: File -> ArrayBuffer -> fflate -> UTF-8 decode -> DOM.
    expect(await screen.findByText(/the total voltage in a series RL circuit/i)).toBeInTheDocument();
    expect(screen.getByText(/leads, between 0° to 90°/)).toBeInTheDocument();
  });

  it('completes a full session and shows the real defect flag in results', async () => {
    render(<QuizLauncherTab />);
    const file = loadFixtureAsFile('ac-circuits.quiz');
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/36 questions loaded/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await screen.findByText(/the total voltage in a series RL circuit/i);

    // Answer Q1 (the correct, de-duplicated choice) then jump straight to the
    // last question via the direct-jump navigator rather than clicking
    // through all 36 — exercises the same navigation a real user has.
    fireEvent.click(screen.getByText('leads, between 0° to 90°'));
    fireEvent.click(screen.getByRole('button', { name: /question 36/i }));
    await waitFor(() => expect(screen.getByText(/item 36 \/ 36/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /finish/i }));

    expect(await screen.findByText(/\/ 36 correct/i)).toBeInTheDocument();
    expect(screen.getByText(/duplicate choice in source/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing here is saved/i)).toBeInTheDocument();
  });

  it('shows Q1 review in the exact same option order the user actually answered, with their pick preserved', async () => {
    // Regression: useCaqSession shuffles once per mount, but CaqRunner was
    // handing CaqResults the pre-shuffle `questions` prop instead of the
    // hook's shuffled array — so the review screen re-rendered every
    // question's options in original file order (correct answer always at
    // A) while the answering screen had shown the shuffled order. A user who
    // picked option B while answering would return to review and see the
    // correct answer sitting at A with no memory of B ever existing.
    render(<QuizLauncherTab />);
    const file = loadFixtureAsFile('ac-circuits.quiz');
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/36 questions loaded/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await screen.findByText(/the total voltage in a series RL circuit/i);

    // Capture Q1's option order exactly as answered, and deliberately pick a
    // WRONG choice — the bug was specifically that a non-A pick "reverted"
    // to looking like A was correct all along.
    const answeringOrder = screen.getAllByRole('radio').map(optionText);
    const wrongChoice = answeringOrder.find((t) => t !== 'leads, between 0° to 90°');
    fireEvent.click(screen.getByText(wrongChoice));

    fireEvent.click(screen.getByRole('button', { name: /question 36/i }));
    await waitFor(() => expect(screen.getByText(/item 36 \/ 36/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /finish/i }));
    await screen.findByText(/\/ 36 correct/i);

    // Review renders all 36 questions in order (CaqResults maps `questions`
    // index-by-index) — the first radiogroup in the document is Q1's.
    const q1Group = screen.getAllByRole('radiogroup')[0];
    const reviewRadios = within(q1Group).getAllByRole('radio');
    const reviewOrder = reviewRadios.map(optionText);

    expect(reviewOrder).toEqual(answeringOrder);

    const selectedInReview = reviewRadios.find((r) => r.getAttribute('aria-checked') === 'true');
    expect(optionText(selectedInReview)).toBe(wrongChoice);
  });

  it('shows a clean, recoverable error for a non-quiz file instead of crashing', async () => {
    render(<QuizLauncherTab />);
    const badFile = new File(['not a zip at all'], 'notes.quiz', { type: 'text/plain' });
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [badFile] } });

    expect(await screen.findByText(/doesn't look like a valid quiz file/i)).toBeInTheDocument();
    // The failed entry doesn't block loading a second, valid file afterward.
    const goodFile = loadFixtureAsFile('alternators.quiz');
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [goodFile] } });
    await waitFor(() => expect(screen.getByText(/49 questions loaded/i)).toBeInTheDocument());
  });
});
