// Admin › Formula cards: what happens to generated cards the server refuses,
// and the Coverage panel. A refused card used to vanish with a count that
// called every failure "incomplete".
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const db = {
  fetchReferenceCards: vi.fn(), fetchPendingReferenceCards: vi.fn(), fetchReferenceCardDebt: vi.fn(),
  createReferenceCard: vi.fn(), updateReferenceCard: vi.fn(), deleteReferenceCard: vi.fn(),
  approveReferenceCard: vi.fn(), rejectReferenceCard: vi.fn(), bulkApproveReferenceCards: vi.fn(),
  fetchRetiredReferenceCards: vi.fn(), intakeReferenceCards: vi.fn(), fetchReferenceSources: vi.fn(),
  createReferenceSource: vi.fn(), deleteReferenceSource: vi.fn(), renameReferenceTag: vi.fn(),
};
vi.mock('../../services/dbQueries', () => db);
const generate = vi.fn();
vi.mock('../../services/geminiApi', () => ({ generateReferenceCardsAI: (...a) => generate(...a), generateReferenceCardsFromSource: vi.fn() }));
vi.mock('../../services/liveTaxonomy', () => ({ refreshLiveTOS: vi.fn(async () => null) }));
vi.mock('../library/readPdfText', () => ({ readPdfText: vi.fn() }));
vi.mock('../../components/AiStatusNote', () => ({ default: () => null }));
vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), loading: vi.fn(() => 't') });
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../../store/useStore', () => ({
  useStore: (select) => select({ dynamicTOS: { EE: ['Circuits', 'Machines', 'Empty topic'], ESAS: [], Mathematics: [] } }),
}));

const { default: ReferenceAdminV2 } = await import('./ReferenceAdminV2');

const row = (name, over = {}) => ({ kind: 'formula', name, formulaLatex: '$a$', description: 'd', variables: [{ symbol: '$a$', meaning: 'm' }], subject: 'EE', topic: 'Circuits', ...over });
const liveCard = (id, name, topic, kind = 'formula', subtopicTag = null) => ({ id, name, kind, subject: 'EE', topic: { name: topic }, subtopicTag, description: 'd', variables: [], formulaLatex: '$a$' });

beforeEach(() => {
  vi.clearAllMocks();
  db.fetchReferenceCards.mockResolvedValue([]);
  db.fetchPendingReferenceCards.mockResolvedValue([]);
  db.fetchRetiredReferenceCards.mockResolvedValue([]);
  db.fetchReferenceSources.mockResolvedValue([]);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

async function generateRows(rows) {
  generate.mockResolvedValue(rows);
  render(<ReferenceAdminV2 />);
  fireEvent.click(await screen.findByRole('radio', { name: 'AI generate' }));
  fireEvent.change(await screen.findByLabelText('Topic'), { target: { value: 'Circuits' } });
  fireEvent.click(screen.getByRole('button', { name: /^Generate/ }));
  await screen.findByText(rows[0].name);
}

describe('queueing generated cards', () => {
  it('keeps refused rows on screen with the reason in plain words', async () => {
    await generateRows([row('Good'), row('Taken'), row('Lost', { topic: 'Circuits' })]);
    db.intakeReferenceCards.mockResolvedValue({ queued: ['1'], rejected: [{ index: 1, reasons: ['duplicate'] }, { index: 2, reasons: ['unknown-topic'] }] });
    fireEvent.click(screen.getByRole('button', { name: /^Queue 3/ }));
    await screen.findByText(/already live or in the review queue/);
    expect(screen.getByText(/isn't in this subject's syllabus/)).toBeInTheDocument();
    expect(screen.getByText('Taken')).toBeInTheDocument();
    expect(screen.queryByText('Good')).not.toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/1 queued.*2 need a fix/), expect.anything());
  });

  it('never calls a refused card incomplete when it is not', async () => {
    await generateRows([row('Taken')]);
    db.intakeReferenceCards.mockResolvedValue({ queued: [], rejected: [{ index: 0, reasons: ['duplicate'] }] });
    fireEvent.click(screen.getByRole('button', { name: /^Queue 1/ }));
    await screen.findByText(/already live/);
    expect(JSON.stringify(toast.mock.calls.concat(toast.success.mock.calls, toast.error.mock.calls))).not.toMatch(/incomplete/);
  });

  it('a refused row can be fixed in place and queued again, as a new request', async () => {
    await generateRows([row('Fix me')]);
    db.intakeReferenceCards.mockResolvedValueOnce({ queued: [], rejected: [{ index: 0, reasons: ['missing-description'] }] });
    fireEvent.click(screen.getByRole('button', { name: /^Queue 1/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Fix me' }));
    fireEvent.change(await screen.findByLabelText('Name', { exact: false }), { target: { value: 'Fixed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Fixed');
    db.intakeReferenceCards.mockResolvedValueOnce({ queued: ['1'], rejected: [] });
    fireEvent.click(screen.getByRole('button', { name: /^Queue 1/ }));
    await waitFor(() => expect(db.intakeReferenceCards).toHaveBeenCalledTimes(2));
    const [first, second] = db.intakeReferenceCards.mock.calls;
    expect(second[0][0].name).toBe('Fixed');
    expect(second[1].idempotencyKey).not.toBe(first[1].idempotencyKey);
  });

  it('flags a topic off the syllabus before queueing, and leaves it unticked', async () => {
    await generateRows([row('Off syllabus', { topic: 'Not a topic' })]);
    expect(screen.getByText(/Missing: topic/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Queue 0/ })).toBeDisabled();
  });

  it('fetches what is pending afresh, so a repeat is flagged and cannot be ticked', async () => {
    db.fetchPendingReferenceCards.mockResolvedValue([liveCard('p', 'Repeat', 'Circuits')]);
    await generateRows([row('Repeat')]);
    expect(screen.getByText('Already a card')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});

describe('Coverage', () => {
  it('lists empty topics first, with counts and tags', async () => {
    db.fetchReferenceCards.mockResolvedValue([
      liveCard('1', 'A', 'Circuits', 'formula', 'AC power'),
      liveCard('2', 'B', 'Circuits', 'constant', 'AC power'),
      liveCard('3', 'C', 'Machines'),
    ]);
    render(<ReferenceAdminV2 />);
    fireEvent.click(await screen.findByRole('radio', { name: 'Coverage' }));
    const rows = await screen.findAllByTestId('coverage-row');
    expect(rows.map((r) => within(r).getByTestId('coverage-topic').textContent)).toEqual(['Empty topic', 'Machines', 'Circuits']);
    expect(rows[2].textContent).toMatch(/1 formula/);
    expect(rows[2].textContent).toMatch(/1 constant/);
    expect(rows[0].textContent).toMatch(/No cards/);
  });

  it('renames a tag across its topic', async () => {
    db.fetchReferenceCards.mockResolvedValue([liveCard('1', 'A', 'Circuits', 'formula', 'AC power')]);
    db.renameReferenceTag.mockResolvedValue({ updated: 1 });
    render(<ReferenceAdminV2 />);
    fireEvent.click(await screen.findByRole('radio', { name: 'Coverage' }));
    fireEvent.click(await screen.findByRole('button', { name: /Rename tag AC power/ }));
    fireEvent.change(await screen.findByLabelText(/New tag/), { target: { value: 'Power triangle' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    await waitFor(() => expect(db.renameReferenceTag).toHaveBeenCalledWith({ subject: 'EE', topic: 'Circuits', from: 'AC power', to: 'Power triangle' }));
  });
});

describe('reviewing', () => {
  it('shows the real card, with variable advice, and asks before rejecting', async () => {
    db.fetchPendingReferenceCards.mockResolvedValue([{ ...liveCard('p', 'Ohm', 'Circuits'), uncovered: ['R'] }]);
    render(<ReferenceAdminV2 />);
    expect(await screen.findByRole('button', { name: /Ohm flashcard/ })).toBeInTheDocument();
    expect(screen.getByText(/Check the variables: R/)).toBeInTheDocument();
    window.confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(db.rejectReferenceCard).not.toHaveBeenCalled();
  });
});
