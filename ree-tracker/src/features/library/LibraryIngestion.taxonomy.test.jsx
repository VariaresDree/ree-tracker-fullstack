// The AI-ingestion Topic dropdown must offer the LIVE taxonomy. It reads the
// store, which starts from the offline snapshot and persists what it last
// held; opening the Library now re-pulls GET /api/config/tos so a stale list
// (the 28-topic EE list that minted "Transient Response" labels) can't linger.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import LibraryIngestion from './LibraryIngestion';

const refreshLiveTOS = vi.fn(() => Promise.resolve(null));
vi.mock('../../services/liveTaxonomy', () => ({ refreshLiveTOS: () => refreshLiveTOS() }));

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));

const LIVE = { EE: ['Electric Circuits 1', 'Electrical Transient Analysis'], ESAS: ['Fluid Mechanics'], Mathematics: ['Algebra'] };
vi.mock('../../store/useStore', () => ({ useStore: (selector) => selector({ dynamicTOS: LIVE }) }));

const noop = () => {};
const props = {
  genSubject: 'EE', setGenSubject: noop, genSubtopic: 'All', setGenSubtopic: noop,
  genFocus: '', setGenFocus: noop, genLoading: false, genStatus: '', parsingPdf: false,
  isOnline: true, selectedPdf: null, isDragging: false,
  handleDragOver: noop, handleDragLeave: noop, handleDrop: noop,
  generatedQuestions: [], showQAModal: false, setShowQAModal: noop, isCommitting: false,
  handleGenerate: noop, handlePdfSelect: noop, executePdfExtraction: noop,
  removeQuestion: noop, handleCommitToMatrix: noop,
};

describe('LibraryIngestion — Topic dropdown', () => {
  it('re-pulls the live taxonomy when the Library opens', () => {
    render(<LibraryIngestion {...props} />);
    expect(refreshLiveTOS).toHaveBeenCalledTimes(1);
  });

  it('offers exactly the live topics for the subject', () => {
    render(<LibraryIngestion {...props} />);
    const select = screen.getByLabelText('Topic');
    const options = within(select).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['All topics', 'Electric Circuits 1', 'Electrical Transient Analysis']);
  });
});
