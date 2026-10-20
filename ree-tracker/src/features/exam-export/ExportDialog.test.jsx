import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

const native = { value: false };
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));

const bankQuestions = (subject, n) => Array.from({ length: n }, (_, i) => ({
  id: `${subject}-${i + 1}`, subject, subtopic: 'General', text: `Question ${i + 1} about $x^2$`,
  options: ['10 V', '20 V', '30 V', '40 V'], answer: '20 V', fixedExplanation: 'Because $V = IR$.',
}));
const db = {
  fetchVaultQuestions: vi.fn(async (subject, subtopic, limit) => bankQuestions(subject, limit)),
  fetchSyllabusWeights: vi.fn(async () => null),
};
vi.mock('../../services/dbQueries', () => db);

const generateExamPaper = vi.fn(async () => ({ filename: 'REE-EE-SETA-2026-10-20.pdf', pages: 4 }));
vi.mock('../board-simulator/examPaper', async (importOriginal) => ({ ...(await importOriginal()), generateExamPaper }));

const { default: ExportDialog } = await import('./ExportDialog');

const AXE_OPTS = {
  rules: {
    'color-contrast': { enabled: false },
    'html-has-lang': { enabled: false },
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
    region: { enabled: false },
    'document-title': { enabled: false },
  },
};

const PRC_EE = { mode: 'subject', subject: 'EE', isPrcStandard: true, count: 100, source: 'library', cognitiveFocus: 'mixed' };
const CUSTOM_AI = { mode: 'subject', subject: 'EE', isPrcStandard: false, count: 20, source: 'ai', cognitiveFocus: 'mixed' };

const renderDialog = (config = PRC_EE, onClose = vi.fn()) => render(
  <MemoryRouter><ExportDialog open onClose={onClose} config={config} /></MemoryRouter>,
);

beforeEach(() => {
  native.value = false;
  generateExamPaper.mockClear();
  db.fetchVaultQuestions.mockClear();
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

describe('ExportDialog', () => {
  it('is a named dialog with the plan, a format choice and a paper choice', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Print or export the exam paper' });
    expect(within(dialog).getByText('100 items \u00B7 EE \u00B7 6 hours')).toBeInTheDocument();
    const format = screen.getByRole('radiogroup', { name: 'Format' });
    expect(within(format).getByRole('radio', { name: 'PDF (print-ready)' })).toHaveAttribute('aria-checked', 'true');
    const paper = screen.getByRole('radiogroup', { name: 'Paper size' });
    expect(within(paper).getAllByRole('radio').map((r) => r.textContent)).toEqual(['A4', 'Letter', 'Long 8.5 \u00D7 13 in']);
  });

  it('keeps worked solutions to the LaTeX export', async () => {
    const user = userEvent.setup();
    renderDialog();
    const solutions = screen.getByRole('checkbox', { name: /Worked solutions in the key/ });
    expect(solutions).toBeDisabled();
    expect(solutions).toHaveAccessibleDescription('Worked solutions are in the LaTeX export');
    await user.click(screen.getByRole('radio', { name: 'LaTeX (editable)' }));
    expect(solutions).toBeEnabled();
    expect(solutions).toBeChecked();
  });

  it('builds the PDF from one draw, on the chosen paper', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('radio', { name: 'Long 8.5 \u00D7 13 in' }));
    await user.click(screen.getByRole('checkbox', { name: 'Answer key' }));
    await user.click(screen.getByRole('button', { name: 'Build PDF' }));
    await waitFor(() => expect(generateExamPaper).toHaveBeenCalledTimes(1));
    const arg = generateExamPaper.mock.calls[0][0];
    expect(arg).toMatchObject({ paper: 'long', documents: { paper: true, sheet: true, key: false } });
    expect(arg.draw.items).toHaveLength(100);
    expect(db.fetchVaultQuestions).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent('PDF saved: REE-EE-SETA-2026-10-20.pdf (4 pages).');
    expect(screen.getByText(/^Set .* items$/)).toHaveTextContent('100 items');

    // The same set for the LaTeX: no new fetch.
    await user.click(screen.getByRole('radio', { name: 'LaTeX (editable)' }));
    await user.click(screen.getByRole('button', { name: 'Build LaTeX files' }));
    await screen.findByRole('heading', { name: 'LaTeX files' });
    expect(db.fetchVaultQuestions).toHaveBeenCalledTimes(1);
  });

  it('lists the LaTeX files, and Copy puts one on the clipboard and says so', async () => {
    const user = userEvent.setup();
    // user-event installs its own clipboard; watch that one.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    renderDialog();
    await user.click(screen.getByRole('radio', { name: 'LaTeX (editable)' }));
    await user.click(screen.getByRole('button', { name: 'Build LaTeX files' }));
    const copies = await screen.findAllByRole('button', { name: /^Copy REE-EE-SET[A-D]-\d{4}-\d{2}-\d{2}-/ });
    expect(copies).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: /^Download REE-/ })).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Download all (.zip)' })).toBeInTheDocument();

    await user.click(copies[0]);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('\\documentclass[10pt]{article}'));
    expect(screen.getByRole('status')).toHaveTextContent(/^Copied REE-EE-.*-questions\.tex\.$/);
  });

  it('offers only Copy in the Android app', async () => {
    native.value = true;
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('radio', { name: 'LaTeX (editable)' }));
    await user.click(screen.getByRole('button', { name: 'Build LaTeX files' }));
    await screen.findAllByRole('button', { name: /^Copy REE-/ });
    expect(screen.queryByRole('button', { name: /Download/ })).toBeNull();
    expect(screen.getByText('Paste each file into Overleaf or a TeX editor.')).toBeInTheDocument();
  });

  it('says why an AI-written mock can\'t be printed, and can\'t be built', () => {
    renderDialog(CUSTOM_AI);
    expect(screen.getByText("AI questions are written for each sitting, so they can't be printed. Choose Question bank to print a paper.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Build PDF' })).toBeDisabled();
  });

  it('links a PRC subject paper to the exam timer', () => {
    renderDialog();
    expect(screen.getByRole('link', { name: 'Time this paper' })).toHaveAttribute('href', '/focus?mode=exam&section=EE');
  });

  it('can\'t build with nothing chosen', async () => {
    const user = userEvent.setup();
    renderDialog();
    for (const name of ['Question paper', 'Answer sheet', 'Answer key']) await user.click(screen.getByRole('checkbox', { name }));
    expect(screen.getByRole('button', { name: 'Build PDF' })).toBeDisabled();
  });

  it('has no axe violations, before and after a build', async () => {
    const user = userEvent.setup();
    renderDialog();
    expect(await axe(document.body, AXE_OPTS)).toHaveNoViolations();
    await user.click(screen.getByRole('radio', { name: 'LaTeX (editable)' }));
    await user.click(screen.getByRole('button', { name: 'Build LaTeX files' }));
    await screen.findByRole('heading', { name: 'LaTeX files' });
    expect(await axe(document.body, AXE_OPTS)).toHaveNoViolations();
  });
});
