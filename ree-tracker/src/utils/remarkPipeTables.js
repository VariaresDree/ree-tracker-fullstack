// src/utils/remarkPipeTables.js
// Pipe tables for LatexRenderer without remark-gfm (no new runtime dependency).
// Without GFM, markdown reads a pipe table as one paragraph of `| a | b |` text.
// This transformer finds those paragraphs, cuts them with the same rules as the
// LaTeX export (utils/pipeTable), and swaps in mdast table nodes, which
// mdast-util-to-hast already turns into <table><thead><tbody>.
//
// - Math stays whole: a `|` inside an inlineMath node (remark-math's own idea of
//   where math is) never splits a cell, so `$|x|$` and `$M_1$` sit in one cell.
// - Cells are parsed again by this processor, so math, bold and `\|` escapes in
//   a cell render as they do anywhere else. Each cell is led by a sentinel so a
//   `-` (an N/A cell), `1.` or `#` stays text instead of becoming a block.
// - If anything doesn't line up, the paragraph is left as it was.
import { isTableRow, isTableStart, parseAlign, splitRow } from './pipeTable';

// Stands in for a `|` inside $...$ while the rows are split (same length, so
// source offsets stay aligned).
const MATH_PIPE = '\uE020';
const MATH_PIPE_RE = /\uE020/g;
// Leads every re-parsed cell and text run; stripped after parsing.
const LEAD = '\uE021';
const LEAD_RE = /^\uE021 ?/;
const ALIGN = { l: 'left', c: 'center', r: 'right' };
const CONTAINERS = new Set(['root', 'blockquote', 'list', 'listItem']);

function collectMath(node, out) {
    if (node.type === 'inlineMath' && node.position) out.push(node.position);
    if (node.children) node.children.forEach((c) => collectMath(c, out));
    return out;
}

function dropPositions(node) {
    delete node.position;
    if (node.children) node.children.forEach(dropPositions);
}

const fit = (cells, n) => Array.from({ length: n }, (_, k) => cells[k] ?? '');
const unmask = (s) => s.replace(MATH_PIPE_RE, '|');

/** The paragraph's source cut into text runs and tables, or null if no table. */
function segmentsOf(source, paragraph, inQuote) {
    const { start, end } = paragraph.position || {};
    if (start?.offset == null || end?.offset == null) return null;
    const slice = source.slice(start.offset, end.offset);
    if (!slice.includes('|') || !slice.includes('-')) return null;

    const chars = slice.split('');
    for (const pos of collectMath(paragraph, [])) {
        for (let k = pos.start.offset - start.offset; k < pos.end.offset - start.offset; k += 1) {
            if (chars[k] === '|') chars[k] = MATH_PIPE;
        }
    }
    let lines = chars.join('').split('\n');
    if (inQuote) lines = lines.map((l) => l.replace(/^[ \t]*(?:>[ \t]?)*/, ''));

    const segments = [];
    let text = [];
    let found = false;
    const flush = () => {
        if (text.length) segments.push({ type: 'text', value: unmask(text.join('\n')) });
        text = [];
    };
    for (let i = 0; i < lines.length;) {
        if (!isTableStart(lines, i)) { text.push(lines[i]); i += 1; continue; }
        flush();
        found = true;
        const header = splitRow(lines[i]).map(unmask);
        const align = fit(parseAlign(lines[i + 1]), header.length);
        const rows = [];
        i += 2;
        while (i < lines.length && isTableRow(lines[i])) {
            rows.push(fit(splitRow(lines[i]), header.length).map(unmask));
            i += 1;
        }
        segments.push({ type: 'table', header, align, rows });
    }
    flush();
    return found ? segments : null;
}

export default function remarkPipeTables() {
    const processor = this;

    /** The paragraph's replacement nodes, or null to keep it. */
    function replace(source, paragraph, inQuote) {
        const segments = segmentsOf(source, paragraph, inQuote);
        if (!segments) return null;
        const pieces = segments.flatMap((s) => (s.type === 'text' ? [s.value] : [s.header, ...s.rows].flat()));
        const parsed = processor.parse(pieces.map((p) => `${LEAD} ${p}`).join('\n\n')).children;
        if (parsed.length !== pieces.length || parsed.some((n) => n.type !== 'paragraph')) return null;
        parsed.forEach((p) => {
            dropPositions(p);
            const first = p.children[0];
            if (first?.type === 'text') {
                first.value = first.value.replace(LEAD_RE, '');
                if (!first.value) p.children.shift();
            }
        });
        let next = 0;
        const inline = () => parsed[next++].children;
        return segments.map((s) => {
            if (s.type === 'text') return { type: 'paragraph', children: inline() };
            return {
                type: 'table',
                align: s.align.map((a) => ALIGN[a]),
                children: [s.header, ...s.rows].map((cells) => ({
                    type: 'tableRow',
                    children: cells.map(() => ({ type: 'tableCell', children: inline() })),
                })),
            };
        });
    }

    return (tree, file) => {
        const source = String(file.value ?? '');
        if (!source.includes('|')) return;
        const walk = (parent, inQuote) => {
            for (let i = 0; i < parent.children.length; i += 1) {
                const node = parent.children[i];
                if (node.type === 'paragraph') {
                    const out = replace(source, node, inQuote);
                    if (out) {
                        parent.children.splice(i, 1, ...out);
                        i += out.length - 1;
                    }
                } else if (CONTAINERS.has(node.type)) {
                    walk(node, inQuote || node.type === 'blockquote');
                }
            }
        };
        walk(tree, false);
    };
}
