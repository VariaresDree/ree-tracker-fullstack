import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const apiRequest = vi.fn();
vi.mock('../../services/dbQueries', () => ({ apiRequest }));

const { default: BankVsBoard } = await import('./BankVsBoard');

const ITEMS = [
  { subject: 'EE', topic: 'Power System Analysis', count: 73 },
  { subject: 'EE', topic: 'Power System Protection', count: 26 },
  { subject: 'EE', topic: 'Electromagnetism', count: 1109 },
  { subject: 'EE', topic: 'Quantities/units/constants (EE)', count: 34 },
  { subject: 'Mathematics', topic: 'Algebra', count: 1025 },
];

const open = () => fireEvent.click(screen.getByRole('button', { name: /Bank vs board/ }));

beforeEach(() => {
  vi.clearAllMocks();
  apiRequest.mockResolvedValue({ items: ITEMS });
});

describe('Bank vs board', () => {
  it('counts nothing until it’s opened, and only once', async () => {
    render(<BankVsBoard />);
    expect(apiRequest).not.toHaveBeenCalled();
    open();
    await screen.findByRole('table');
    open();
    open();
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it('adds up a shared count, puts the thinnest first, and flags it', async () => {
    render(<BankVsBoard />);
    open();
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    // Topics with nothing in the bank come first, at 0 per item.
    const psa = rows.find((r) => r.textContent.includes('Power System Analysis'));
    expect(psa).toHaveTextContent('Power System Analysis, Power System Protection');
    expect(within(psa).getByText('99')).toBeInTheDocument();
    expect(within(psa).getByText('Thin')).toBeInTheDocument();
    const em = rows.find((r) => r.textContent.includes('Electromagnetism'));
    expect(within(em).queryByText('Thin')).not.toBeInTheDocument();
    expect(rows.indexOf(psa)).toBeLessThan(rows.indexOf(em));
  });

  it('lists what PRC doesn’t itemize apart, and switches subject', async () => {
    render(<BankVsBoard />);
    open();
    await screen.findByRole('table');
    expect(screen.getByText(/Quantities\/units\/constants \(EE\) \(34\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Math' }));
    expect(within(screen.getByRole('table')).getByText('Algebra, Complex Numbers')).toBeInTheDocument();
  });

  it('says why when it can’t count', async () => {
    apiRequest.mockRejectedValue(new Error('Server trouble'));
    render(<BankVsBoard />);
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Server trouble');
  });
});
