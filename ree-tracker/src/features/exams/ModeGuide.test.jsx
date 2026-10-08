// "Which mode do I use?": the four ways to study, with where to start.
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ModeGuide from './ModeGuide';
import { MODES, startingMode } from './modes';

const renderGuide = (props) => render(<MemoryRouter><ModeGuide {...props} /></MemoryRouter>);

describe('ModeGuide', () => {
  it('lists the four modes, each linking to where it starts', () => {
    renderGuide({ start: 'mock' });
    expect(screen.getByRole('heading', { level: 2, name: 'Which mode do I use?' })).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/practice', '/exams?tab=mock', '/exams?tab=gauntlet', '/exams?tab=battles']);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(MODES.map((m) => m.name));
    expect(screen.getByText(/Not passing a tier locks it for 12 hours/)).toBeInTheDocument();
  });

  it('marks the one to start with', () => {
    renderGuide({ start: 'mock' });
    const mock = screen.getByRole('link', { name: /Mock board/ });
    expect(within(mock).getByText('Start here')).toBeInTheDocument();
    expect(screen.getAllByText('Start here')).toHaveLength(1);
  });

  it('folded, it is a disclosure that opens on tap', () => {
    renderGuide({ folded: true });
    const summary = screen.getByText('Which mode do I use?');
    const details = summary.closest('details');
    expect(details.open).toBe(false);
    fireEvent.click(summary);
    expect(details.open).toBe(true);
  });
});

describe('startingMode', () => {
  it('starts below 60% with Practice, under the 70% pass mark with a Mock board, above it with the Gauntlet', () => {
    expect(startingMode(45)).toBe('practice');
    expect(startingMode(59.9)).toBe('practice');
    expect(startingMode(60)).toBe('mock');
    expect(startingMode(69.9)).toBe('mock');
    expect(startingMode(70)).toBe('gauntlet');
    expect(startingMode(null)).toBe('practice');
  });
});
