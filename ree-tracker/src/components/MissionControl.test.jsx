import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MissionControl from './MissionControl';

// Daily targets now only shows today's progress; the exam date and target are
// edited in Account → Exam plan, which its Edit button opens.
describe('MissionControl', () => {
  it('shows today against the per-subject split and links to the one editor', () => {
    render(
      <MemoryRouter>
        <MissionControl stats={{ dailyTarget: 50, dailyMath: 4, dailyESAS: 0, dailyEE: 9 }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText('/ 50 today')).toBeInTheDocument();
    expect(screen.getByText('4 / 12')).toBeInTheDocument();
    expect(screen.getByText('9 / 23')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit/i })).toHaveAttribute('href', '/account#exam-plan');
    expect(screen.queryByText(/purge|reset today/i)).toBeNull();
  });
});
