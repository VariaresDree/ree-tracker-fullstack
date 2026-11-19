// The formula sheet: Hide formulas makes it a self-test, a row opens its details,
// and Print this sheet opens a subject or topic on /print/formulas.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../../hooks/useAppearance', () => ({ useAppearance: () => {} }));
const CARDS = [
  { id: '1', subject: 'EE', kind: 'formula', name: 'Ohm’s law', formulaLatex: 'V = IR', topic: { name: 'Circuits' } },
  { id: '2', subject: 'EE', kind: 'formula', name: 'Power', formulaLatex: 'P = VI', topic: { name: 'Circuits' } },
  { id: '3', subject: 'EE', kind: 'formula', name: 'Slip', formulaLatex: 's = 1 - N/Ns', topic: { name: 'Machines' } },
  { id: '4', subject: 'ESAS', kind: 'formula', name: 'Ideal gas', formulaLatex: 'PV = nRT', topic: { name: 'Thermo' } },
];
vi.mock('./useReferenceCards', () => ({ useReferenceCards: () => ({ cards: CARDS, loading: false }) }));
vi.mock('./useCardReviews', () => ({ useCardReviews: () => ({ items: [] }) }));

const { default: QuickSheet } = await import('./QuickSheet');
const { default: PrintFormulas } = await import('../../pages/PrintFormulas');

const sheet = (props = {}) => render(
  <MemoryRouter><QuickSheet cards={CARDS.slice(0, 2)} scopeLabel="EE" onStudy={() => {}} {...props} /></MemoryRouter>,
);

describe('Hide formulas', () => {
  it('blanks the formulas, reveals one on a tap, and Show formulas brings them back', () => {
    sheet();
    expect(screen.getByText(/V = IR/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Hide formulas/ }));
    expect(screen.queryByText(/V = IR/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tap to reveal Ohm’s law' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Tap to reveal Ohm’s law/ }));
    expect(screen.getByText(/V = IR/)).toBeInTheDocument();
    expect(screen.queryByText(/P = VI/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show formulas/ }));
    expect(screen.getByText(/P = VI/)).toBeInTheDocument();
  });

  it('hiding again starts over, with nothing revealed', () => {
    sheet();
    fireEvent.click(screen.getByRole('button', { name: /Hide formulas/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tap to reveal Ohm’s law/ }));
    fireEvent.click(screen.getByRole('button', { name: /Show formulas/ }));
    fireEvent.click(screen.getByRole('button', { name: /Hide formulas/ }));
    expect(screen.queryByText(/V = IR/)).not.toBeInTheDocument();
  });
});

describe('A row', () => {
  it('opens what its symbols mean, what it is for and the board tip, then closes', () => {
    const card = {
      id: '9', subject: 'EE', kind: 'formula', name: 'Ohm’s law', formulaLatex: 'V = IR', valueUnit: 'V',
      description: 'Voltage across a resistor.', purposeExamTip: 'Check the units first.',
      variables: [{ symbol: 'R', meaning: 'resistance', unit: 'Ω' }], topic: { name: 'Circuits' },
    };
    render(<MemoryRouter><QuickSheet cards={[card]} scopeLabel="EE" /></MemoryRouter>);
    const row = screen.getByRole('button', { name: /Ohm’s law/ });
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Board tip')).toBeNull();
    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Board tip')).toBeInTheDocument();
    expect(screen.getByText(/Voltage across a resistor/)).toBeInTheDocument();
    expect(screen.getByText(/resistance/)).toBeInTheDocument();
    fireEvent.click(row);
    expect(screen.queryByText('Board tip')).toBeNull();
  });
});

describe('Print this sheet', () => {
  it('links to the scope it was given', () => {
    sheet({ printTo: '/print/formulas?subject=EE' });
    expect(screen.getByRole('link', { name: /Print this sheet/ })).toHaveAttribute('href', '/print/formulas?subject=EE');
  });

  const printPage = (url) => render(<MemoryRouter initialEntries={[url]}><PrintFormulas /></MemoryRouter>);

  it('prints a whole subject, by topic and then name', () => {
    printPage('/print/formulas?subject=EE');
    expect(screen.getByRole('heading', { level: 1, name: 'EE: formulas and constants' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Ohm’s law', 'Power', 'Slip']);
  });

  it('prints one topic', () => {
    printPage('/print/formulas?subject=EE&topic=Machines');
    expect(screen.getByRole('heading', { level: 1, name: 'Machines: formulas and constants' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Slip']);
  });

  it('says so when there’s nothing to print, and disables Print', () => {
    printPage('/print/formulas?subject=EE&topic=Nothing');
    expect(screen.getByText('No cards to print here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print/ })).toBeDisabled();
  });

  it('with no scope it stays the weak-cards sheet', () => {
    printPage('/print/formulas');
    expect(screen.getByText('No weak formulas to print')).toBeInTheDocument();
  });
});
