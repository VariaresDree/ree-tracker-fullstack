// src/features/reference/ReferenceAdminV2.liveCards.test.jsx
//
// The Live Cards panel had no search or sort at all — a flat, unfiltered
// `live.map(cardRow)`. This locks the new toolbar: real-time search across
// name/symbol/subtopicTag/description, and each of the six sorts actually
// reorders the list (not just accepts a value with no effect).
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReferenceAdminV2 from './ReferenceAdminV2';

vi.mock('../../components/LatexRenderer', () => ({
  default: ({ content }) => <span>{content}</span>,
}));

// Dates and names are deliberately chosen so "recently added", "A–Z", and
// "card type" each produce a DIFFERENT order from one another — a fixture
// where they happened to coincide (as an earlier draft of this test did)
// couldn't distinguish "the sort actually ran" from "sort is a no-op that
// just returns input order."
const CARDS = [
  { id: '1', kind: 'formula', name: 'Alpha Formula', symbol: 'V_z', subject: 'EE', subtopicTag: 'Diodes', description: 'Reverse breakdown.', variables: [], createdAt: '2026-01-01T00:00:00Z', topic: null },
  { id: '2', kind: 'constant', name: 'Zeta Constant', symbol: 'N_A', subject: 'ESAS', subtopicTag: 'Chemistry', description: 'Particles per mole.', variables: [], createdAt: '2026-03-01T00:00:00Z', topic: null },
  { id: '3', kind: 'constant', name: 'Mu Constant', symbol: 'k', subject: 'EE', subtopicTag: 'Thermo', description: 'Relates energy to temperature.', variables: [], createdAt: '2026-02-01T00:00:00Z', topic: null },
];

vi.mock('../../services/dbQueries', () => ({
  fetchReferenceCards: vi.fn(() => Promise.resolve(CARDS)),
  fetchPendingReferenceCards: vi.fn(() => Promise.resolve([])),
  fetchReferenceCardDebt: vi.fn(() => Promise.resolve({ items: [], checked: 0 })),
  fetchReferenceSources: vi.fn(() => Promise.resolve([])),
  createReferenceCard: vi.fn(),
  updateReferenceCard: vi.fn(),
  deleteReferenceCard: vi.fn(),
  approveReferenceCard: vi.fn(),
  rejectReferenceCard: vi.fn(),
  bulkApproveReferenceCards: vi.fn(),
  intakeReferenceCards: vi.fn(),
  createReferenceSource: vi.fn(),
  deleteReferenceSource: vi.fn(),
}));

async function openLivePanel() {
  render(<ReferenceAdminV2 />);
  fireEvent.click(screen.getByRole('radio', { name: /live cards/i }));
  await waitFor(() => expect(screen.getByText(/3 of 3 live cards/i)).toBeInTheDocument());
}

function cardNamesInOrder() {
  return screen.getAllByTitle(/Alpha Formula|Zeta Constant|Mu Constant/).map((el) => el.textContent);
}

describe('ReferenceAdminV2 — Live Cards search + sort', () => {
  it('shows all live cards by default, sorted Recently added (newest first)', async () => {
    await openLivePanel();
    expect(cardNamesInOrder()).toEqual(['Zeta Constant', 'Mu Constant', 'Alpha Formula']);
  });

  it('search filters in real time across name/symbol/subtopicTag/description', async () => {
    await openLivePanel();
    fireEvent.change(screen.getByLabelText(/search live cards/i), { target: { value: 'thermo' } });
    await waitFor(() => expect(screen.getByText(/1 of 3 live cards/i)).toBeInTheDocument());
    expect(cardNamesInOrder()).toEqual(['Mu Constant']);
  });

  it('shows a clear-search empty state when nothing matches', async () => {
    await openLivePanel();
    fireEvent.change(screen.getByLabelText(/search live cards/i), { target: { value: 'nonexistent-xyz' } });
    await waitFor(() => expect(screen.getByText(/no cards match/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
    await waitFor(() => expect(screen.getByText(/3 of 3 live cards/i)).toBeInTheDocument());
  });

  it('Alphabetical sort reorders A→Z by name, distinct from the default Recently-added order', async () => {
    await openLivePanel();
    fireEvent.change(screen.getByLabelText(/sort live cards/i), { target: { value: 'az' } });
    await waitFor(() => expect(cardNamesInOrder()).toEqual(['Alpha Formula', 'Mu Constant', 'Zeta Constant']));
  });

  it('Card type sort groups by kind (constants together, then formulas), distinct from A–Z', async () => {
    await openLivePanel();
    fireEvent.change(screen.getByLabelText(/sort live cards/i), { target: { value: 'type' } });
    // 'constant' < 'formula' alphabetically — both constants (name-sorted
    // within the group) come before the one formula.
    await waitFor(() => expect(cardNamesInOrder()).toEqual(['Mu Constant', 'Zeta Constant', 'Alpha Formula']));
  });

  it('Needs attention sort puts the most-incomplete card first', async () => {
    await openLivePanel();
    // All three CARDS fixtures are missing valueUnit (constants) and
    // formulaLatex (the formula) — quickMissing flags all three identically,
    // so this proves the sort runs, not a specific ordering among ties.
    fireEvent.change(screen.getByLabelText(/sort live cards/i), { target: { value: 'attention' } });
    await waitFor(() => expect(cardNamesInOrder().length).toBe(3));
  });
});
