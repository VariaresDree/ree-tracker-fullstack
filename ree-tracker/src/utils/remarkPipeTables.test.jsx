// Pipe tables in LatexRenderer. Without remark-gfm a stem's table showed as raw
// `| Load | Power (kW) |` text in practice, review and the print preview, while
// the .tex export already set it as a table. These lock the in-repo plugin to
// the export's rules.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LatexRenderer from '../components/LatexRenderer';
import tricky from '../features/exam-export/__fixtures__/tricky-questions.json';
import { parseAlign, splitRow } from './pipeTable';

const item = (id) => tricky.find((q) => q.id === id);
const cellText = (row) => [...row.children].map((c) => c.textContent.trim());

describe('pipe table rules (shared with the LaTeX export)', () => {
    it('splits a row on unescaped pipes and trims the outer ones', () => {
        expect(splitRow('| a | b \\| c | d |')).toEqual(['a', 'b \\| c', 'd']);
        expect(splitRow('a | b')).toEqual(['a', 'b']);
    });

    it('reads the delimiter row as left, right and centre', () => {
        expect(parseAlign('|:-----|----------:|:----:|---|')).toEqual(['l', 'r', 'c', 'l']);
    });
});

describe('LatexRenderer pipe tables', () => {
    it('renders the fixture stem as a table with its alignment, and keeps the text around it', () => {
        const { container } = render(<LatexRenderer content={item('t03').text} />);
        const tables = container.querySelectorAll('table');
        expect(tables).toHaveLength(1);
        const table = tables[0];
        expect(table.parentElement.className).toBe('math-table');
        expect(cellText(table.querySelector('thead tr'))).toEqual(['Load', 'Power (kW)', 'Hours']);
        const rows = table.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(3);
        expect(cellText(rows[0])).toEqual(['Lighting', '2.5', '6']);

        const ths = table.querySelectorAll('th');
        expect([...ths].map((c) => c.style.textAlign)).toEqual(['left', 'right', 'center']);
        expect([...rows[2].children].map((c) => c.style.textAlign)).toEqual(['left', 'right', 'center']);

        const paras = [...container.querySelectorAll('p')].map((p) => p.textContent);
        expect(paras).toEqual(['Use the load table to find the total demand.', 'What is the energy used per day?']);
        expect(container.textContent).not.toContain('|');
    });

    it('typesets inline math inside a cell, and a pipe inside math never splits a cell', () => {
        const { container } = render(<LatexRenderer content={item('t03').text} />);
        const motor = container.querySelectorAll('tbody tr')[1].children[0];
        expect(motor.tagName).toBe('TD');
        expect(motor.querySelector('.katex')).not.toBeNull();

        const abs = render(<LatexRenderer content={'| Quantity | Value |\n|---|---|\n| $|x|$ | 5 |'} />).container;
        const row = abs.querySelector('tbody tr');
        expect(row.children).toHaveLength(2);
        expect(row.children[0].querySelector('.katex')).not.toBeNull();
    });

    it('renders the worked solution table too (no alignment row colons)', () => {
        const { container } = render(<LatexRenderer content={item('t03').fixedExplanation} />);
        expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
        expect(container.querySelectorAll('td .katex')).toHaveLength(3);
        expect(container.querySelector('p').textContent).toContain('Total');
    });

    it('leaves a line that only contains `|` as text', () => {
        const { container } = render(<LatexRenderer content={item('t28').text} />);
        expect(container.querySelector('table')).toBeNull();
        expect(container.textContent).toContain('a|b');

        const prose = render(<LatexRenderer content={'If |x| = 5 then x = 5 or -5.\nA | B are both - fine.'} />).container;
        expect(prose.querySelector('table')).toBeNull();
        expect(prose.textContent).toContain('|x| = 5');
    });

    it('keeps an escaped pipe in its cell, a dash cell as text, and pads a short row', () => {
        const md = '| Case | Note | Extra |\n|---|---|---|\n| a \\| b | - |\n| 1. | **bold** | x |';
        const { container } = render(<LatexRenderer content={md} />);
        const rows = container.querySelectorAll('tbody tr');
        expect(cellText(rows[0])).toEqual(['a | b', '-', '']);
        expect(cellText(rows[1])).toEqual(['1.', 'bold', 'x']);
        expect(rows[1].querySelector('strong')).not.toBeNull();
        expect(container.querySelector('ul, ol')).toBeNull();
    });

    it('inline mode (an option) keeps the table as text, since a table cannot sit in a span', () => {
        const { container } = render(<LatexRenderer inline content={item('t34').options[0]} />);
        expect(container.querySelector('table')).toBeNull();
        expect(container.firstChild.tagName).toBe('SPAN');
    });
});
