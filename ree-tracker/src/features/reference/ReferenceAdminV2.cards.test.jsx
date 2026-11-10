// src/features/reference/ReferenceAdminV2.cards.test.jsx
//
// Admin › Formula cards › Cards (admin/CardsPanel.jsx): every published card
// by subject and topic in syllabus order, as learners find them, with Needs
// fixing and Retired as filters. It replaced four sections: Live cards,
// Coverage, Data debt and the retired list.
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
vi.mock('../../services/liveTaxonomy', () => ({ refreshLiveTOS: vi.fn(async () => null) }));
vi.mock('../../components/AiStatusNote', () => ({ default: () => null }));
vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
const toast = Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), loading: vi.fn(() => 't') });
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('../../store/useStore', () => ({
  useStore: (select) => select({ dynamicTOS: { Mathematics: ['Calculus 1'], ESAS: ['Chemistry for Engineers'], EE: ['Electromagnetism', 'Electric Circuits 2', 'Machines'] } }),
}));

const { default: ReferenceAdminV2 } = await import('./ReferenceAdminV2');

const card = (id, name, subject, topic, over = {}) => ({
  id, name, subject, kind: 'formula', topic: topic ? { name: topic } : null, subtopicTag: null,
  description: `${name} described.`, variables: [], formulaLatex: '$a$', createdAt: '2026-01-01T00:00:00Z', ...over,
});
// Dates, names and kinds chosen so A–Z, Recently added and Card type each give a different order.
const LIVE = [
  card('1', 'Alpha Formula', 'EE', 'Electric Circuits 2', { subtopicTag: 'AC Power', createdAt: '2026-01-01T00:00:00Z' }),
  card('2', 'Zeta Constant', 'ESAS', 'Chemistry for Engineers', { kind: 'constant', symbol: 'N_A', createdAt: '2026-03-01T00:00:00Z' }),
  card('3', 'Mu Constant', 'EE', 'Electric Circuits 2', { kind: 'constant', subtopicTag: 'AC Power', description: 'Relates energy to temperature.', createdAt: '2026-02-01T00:00:00Z' }),
  card('4', 'Gauss', 'EE', 'Electromagnetism', { createdAt: '2025-12-01T00:00:00Z' }),
];
const RETIRED = [card('9', 'Skin effect', 'EE', 'Electromagnetism', { kind: 'concept', formulaLatex: null })];

beforeEach(() => {
  vi.clearAllMocks();
  db.fetchReferenceCards.mockResolvedValue(LIVE);
  db.fetchPendingReferenceCards.mockResolvedValue([]);
  db.fetchRetiredReferenceCards.mockResolvedValue(RETIRED);
  db.fetchReferenceSources.mockResolvedValue([]);
  db.fetchReferenceCardDebt.mockResolvedValue({ items: [{ card: LIVE[1], reasons: ['value/unit'] }], checked: 4 });
});

async function openCards() {
  render(<ReferenceAdminV2 />);
  fireEvent.click(await screen.findByRole('radio', { name: 'Cards' }));
  await screen.findByText('4 cards');
}
const names = () => screen.getAllByTitle(/Alpha Formula|Zeta Constant|Mu Constant|Gauss|Skin effect/).map((el) => el.textContent);
const topicRows = (subject) => within(screen.getByRole('region', { name: subject })).getAllByTestId('topic-row');
const openTopic = (name) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));

describe('sections', () => {
  it('four, not seven', async () => {
    render(<ReferenceAdminV2 />);
    const group = await screen.findByRole('radiogroup', { name: 'Reference admin sections' });
    expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Review', 'Cards', 'Add', 'Sources']);
  });
});

describe('Cards, by syllabus', () => {
  it('lists every topic in syllabus order, thin ones too, subjects in board order', async () => {
    await openCards();
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Mathematics · 0 of 1 topics have cards', 'ESAS · 1 of 1 topics have cards', 'EE · 2 of 3 topics have cards',
    ]);
    expect(topicRows('EE').map((r) => r.querySelector('button').textContent)).toEqual([
      expect.stringMatching(/^Electromagnetism1 formula · 0 constants/),
      expect.stringMatching(/^Electric Circuits 21 formula · 1 constant/),
      expect.stringMatching(/^MachinesNo cards yet/),
    ]);
  });

  it('a topic opens on its cards under their tags, as learners see them', async () => {
    await openCards();
    openTopic('Electric Circuits 2');
    const tag = screen.getByRole('region', { name: 'AC Power' });
    // Formulas before constants, as on the learner's sheet.
    expect(within(tag).getAllByTitle(/Formula|Constant/).map((el) => el.textContent)).toEqual(['Alpha Formula', 'Mu Constant']);
  });

  it('one subject at a time', async () => {
    await openCards();
    fireEvent.click(screen.getByRole('radio', { name: 'ESAS' }));
    expect(screen.getByText('1 card in ESAS')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'EE' })).not.toBeInTheDocument();
  });

  it('renames a tag from its heading', async () => {
    db.renameReferenceTag.mockResolvedValue({ updated: 2 });
    await openCards();
    openTopic('Electric Circuits 2');
    fireEvent.click(screen.getByRole('button', { name: 'Rename tag AC Power' }));
    fireEvent.change(await screen.findByLabelText(/New tag/), { target: { value: 'Power triangle' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    await waitFor(() => expect(db.renameReferenceTag).toHaveBeenCalledWith({ subject: 'EE', topic: 'Electric Circuits 2', from: 'AC Power', to: 'Power triangle' }));
  });

  it('shows 30 of a big topic, then more', async () => {
    db.fetchReferenceCards.mockResolvedValue(Array.from({ length: 35 }, (_, i) => card(`m${i}`, `Machine card ${i + 1}`, 'EE', 'Machines')));
    db.fetchReferenceCardDebt.mockResolvedValue({ items: [], checked: 35 });
    render(<ReferenceAdminV2 />);
    fireEvent.click(await screen.findByRole('radio', { name: 'Cards' }));
    await screen.findByText('35 cards');
    openTopic('Machines');
    expect(screen.getAllByTitle(/^Machine card/)).toHaveLength(30);
    fireEvent.click(screen.getByRole('button', { name: 'Show 5 more of 5' }));
    expect(screen.getAllByTitle(/^Machine card/)).toHaveLength(35);
  });
});

describe('search and sort', () => {
  it('search reaches name, symbol, tag, topic and description, and opens what it finds', async () => {
    await openCards();
    fireEvent.change(screen.getByLabelText('Search cards'), { target: { value: 'temperature' } });
    await screen.findByText('1 card');
    expect(names()).toEqual(['Mu Constant']);
    fireEvent.change(screen.getByLabelText('Search cards'), { target: { value: 'n_a' } });
    await waitFor(() => expect(names()).toEqual(['Zeta Constant']));
    fireEvent.change(screen.getByLabelText('Search cards'), { target: { value: 'electromagnetism' } });
    await waitFor(() => expect(names()).toEqual(['Gauss']));
  });

  it('says so when nothing matches, and clears', async () => {
    await openCards();
    fireEvent.change(screen.getByLabelText('Search cards'), { target: { value: 'nonexistent-xyz' } });
    expect(await screen.findByText('No cards match')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(await screen.findByText('4 cards')).toBeInTheDocument();
  });

  it.each([
    ['az', ['Alpha Formula', 'Gauss', 'Mu Constant', 'Zeta Constant']],
    ['recent', ['Zeta Constant', 'Mu Constant', 'Alpha Formula', 'Gauss']],
    ['type', ['Mu Constant', 'Zeta Constant', 'Alpha Formula', 'Gauss']],
  ])('sort %s is one list in its own order', async (sort, order) => {
    await openCards();
    fireEvent.change(screen.getByLabelText('Sort cards'), { target: { value: sort } });
    await waitFor(() => expect(names()).toEqual(order));
  });
});

describe('Needs fixing and Retired', () => {
  it('Needs fixing lists the cards the required-field report names, with why, to fix', async () => {
    await openCards();
    fireEvent.click(screen.getByRole('radio', { name: 'Needs fixing (1)' }));
    expect(await screen.findByText('1 card to fix')).toBeInTheDocument();
    expect(names()).toEqual(['Zeta Constant']);
    expect(screen.getByText('value/unit')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fix' }));
    expect(await screen.findByRole('dialog', { name: /Edit: Zeta Constant/ })).toBeInTheDocument();
  });

  it('a card fixed in the editor leaves Needs fixing', async () => {
    db.updateReferenceCard.mockResolvedValue({ item: { ...LIVE[1], valueUnit: '6.022e23' } });
    await openCards();
    fireEvent.click(screen.getByRole('radio', { name: 'Needs fixing (1)' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Fix' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing needs fixing')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Needs fixing (0)' })).toBeInTheDocument();
  });

  it('Retired lists concept cards, to re-type as a formula or delete', async () => {
    await openCards();
    fireEvent.click(screen.getByRole('radio', { name: 'Retired (1)' }));
    expect(await screen.findByText('1 retired card')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Re-type' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    const kind = screen.getByLabelText('Kind', { selector: 'select' });
    expect(kind).toHaveValue('formula');
    expect([...kind.options].map((o) => o.value)).toEqual(['formula', 'constant']);
  });
});

describe('deleting', () => {
  it('asks in a dialog first, and Cancel keeps the card', async () => {
    db.deleteReferenceCard.mockResolvedValue({});
    await openCards();
    fireEvent.change(screen.getByLabelText('Sort cards'), { target: { value: 'az' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    const dialog = await screen.findByRole('dialog', { name: /Delete "Alpha Formula"/ });
    expect(dialog).toHaveTextContent(/review progress on this card is lost/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(db.deleteReferenceCard).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(db.deleteReferenceCard).toHaveBeenCalledWith('1'));
    expect(await screen.findByText('3 cards')).toBeInTheDocument();
  });
});
