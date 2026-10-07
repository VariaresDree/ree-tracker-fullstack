import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import useTabParam from './useTabParam';

// Hub pages keep their tab in ?tab= so a deep link and a reload land on the
// same tab. Switching tabs REPLACES the entry: on a phone, Back should leave
// the page, not walk back through every tab you peeked at.
function Hub() {
    const [tab, setTab] = useTabParam(['mock', 'gauntlet', 'battles'], 'mock');
    const loc = useLocation();
    return (
        <>
            <span data-testid="tab">{tab}</span>
            <span data-testid="search">{loc.search}</span>
            <button onClick={() => setTab('battles')}>battles</button>
            <button onClick={() => setTab('mock')}>mock</button>
        </>
    );
}

const renderAt = (entries, index) => render(
    <MemoryRouter initialEntries={entries} initialIndex={index}><Hub /></MemoryRouter>,
);

describe('useTabParam', () => {
    it('reads a valid ?tab=, falls back on a missing or unknown one', () => {
        renderAt(['/exams?tab=gauntlet']);
        expect(screen.getByTestId('tab').textContent).toBe('gauntlet');
    });

    it('an unknown tab falls back to the default', () => {
        renderAt(['/exams?tab=nope']);
        expect(screen.getByTestId('tab').textContent).toBe('mock');
    });

    it('writes the tab to the URL, and leaves the default out of it', () => {
        renderAt(['/exams']);
        fireEvent.click(screen.getByText('battles'));
        expect(screen.getByTestId('tab').textContent).toBe('battles');
        expect(screen.getByTestId('search').textContent).toBe('?tab=battles');
        fireEvent.click(screen.getByText('mock'));
        expect(screen.getByTestId('search').textContent).toBe('');
    });
});
