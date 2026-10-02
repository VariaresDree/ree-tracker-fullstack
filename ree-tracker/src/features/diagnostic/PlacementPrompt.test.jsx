import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const fetchDiagnosticStatus = vi.fn();
vi.mock('../../services/dbQueries', () => ({ fetchDiagnosticStatus: (...a) => fetchDiagnosticStatus(...a) }));

const { default: PlacementPrompt } = await import('./PlacementPrompt');

const renderIt = (props) => render(<MemoryRouter><PlacementPrompt uid="u1" {...props} /></MemoryRouter>);

beforeEach(() => {
  fetchDiagnosticStatus.mockReset();
  localStorage.clear();
});

describe('PlacementPrompt', () => {
  it('invites a new account to the placement test', async () => {
    fetchDiagnosticStatus.mockResolvedValue({ status: 'none' });
    renderIt({ answered: 3 });
    expect(await screen.findByText('Find your starting level')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Take the test' })).toHaveAttribute('href', '/diagnostic');
  });

  it('offers to resume an unfinished sitting, even for an experienced account', async () => {
    fetchDiagnosticStatus.mockResolvedValue({ status: 'in_progress', progress: { answered: 7, total: 19 } });
    renderIt({ answered: 400 });
    expect(await screen.findByText('Finish your placement test')).toBeInTheDocument();
    expect(screen.getByText(/7 of about 19/)).toBeInTheDocument();
  });

  it('stays out of the way once placed, or for an established account', async () => {
    fetchDiagnosticStatus.mockResolvedValue({ status: 'completed', result: {} });
    const { container } = renderIt({ answered: 3 });
    await waitFor(() => expect(fetchDiagnosticStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();

    fetchDiagnosticStatus.mockResolvedValue({ status: 'none' });
    const second = renderIt({ answered: 31 });
    await waitFor(() => expect(fetchDiagnosticStatus).toHaveBeenCalledTimes(2));
    expect(second.container).toBeEmptyDOMElement();
  });

  it('"Not now" is remembered for this account and stops asking the server', async () => {
    fetchDiagnosticStatus.mockResolvedValue({ status: 'none' });
    const { container } = renderIt({ answered: 0 });
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(container).toBeEmptyDOMElement();

    fetchDiagnosticStatus.mockClear();
    renderIt({ answered: 0 });
    expect(fetchDiagnosticStatus).not.toHaveBeenCalled();
  });
});
