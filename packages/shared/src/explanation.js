// Reading a worked explanation: the one format the AI prompts ask for, and the
// structure older rows carry only in words ("Given: ... Solution: 1) ... 2) ...",
// all on one line). This runs when an explanation is shown, so the whole bank
// reads better with no data change. It only moves line breaks and marks labels;
// it never changes a word, and never looks inside math.

'use strict';

const LABELS = ['Key idea', 'Given', 'Find', 'Required', 'Solution', 'Answer', 'Why the others are wrong', 'Why', 'Remember'];
const NAMES = LABELS.join('|');

// A capitalised label with a colon, starting the text or a sentence.
const LABEL_IN_TEXT = new RegExp(`(^|[\\s.;!?)])(?:\\*\\*)?(${NAMES})(?:\\*\\*)?:(?:\\*\\*)?[ \\t]*`, 'g');
const MARKED_LABEL = new RegExp(`^\\*\\*(${NAMES}):\\*\\*[ \\t]*`, 'gm');
const MATH = /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$/g;
const STEP = /(^|\s)(\d{1,2})[.)]\s+(?=\S)/g;
const LIST_LINE = /^\s*(?:\d+[.)]|[-*+])\s|^\s+\S/;
const TABLE_LINE = /^\s*\|/;

/** Runs of 1, 2, 3… in order; anything else is a decimal or a value, not a step. */
function stepsToMark(text) {
    const marked = [];
    let run = [];
    const close = () => { if (run.length >= 2) marked.push(...run); run = []; };
    for (const match of text.matchAll(STEP)) {
        const number = Number(match[2]);
        if (number === run.length + 1) run.push(match);
        else if (number === 1) { close(); run.push(match); }
    }
    close();
    return marked;
}

const lineKind = (line) => (LIST_LINE.test(line) ? 'list' : TABLE_LINE.test(line) ? 'table' : 'text');

/** A single break between sentences collapses in Markdown: make it a paragraph. */
function spaceLines(text) {
    const lines = text.split('\n').map((line) => line.trimEnd()).filter(Boolean);
    return lines.reduce((out, line, i) => {
        if (i === 0) return line;
        const kind = lineKind(line);
        return out + (kind !== 'text' && kind === lineKind(lines[i - 1]) ? '\n' : '\n\n') + line;
    }, '');
}

/** Markdown with its labels marked, its steps numbered and its parts spaced. */
function structureExplanation(text) {
    if (typeof text !== 'string' || !text.trim()) return text;
    const math = [];
    let out = text.replace(MATH, (span) => `${math.push(span) - 1}`);
    out = out.replace(LABEL_IN_TEXT, (_, before, label) => `${before}\n\n**${label}:** `);
    for (const match of stepsToMark(out).reverse()) {
        const end = match.index + match[0].length;
        out = `${out.slice(0, match.index)}\n${match[2]}. ${out.slice(end)}`;
    }
    out = spaceLines(out);
    // eslint-disable-next-line no-control-regex
    return out.replace(/(\d+)/g, (_, i) => math[Number(i)]);
}

/** [{ label, body }] from structured text; the text before any label has label null. */
function explanationSections(structured) {
    if (typeof structured !== 'string' || !structured.trim()) return [];
    const marks = [...structured.matchAll(MARKED_LABEL)];
    const sections = [];
    const lead = structured.slice(0, marks[0]?.index ?? structured.length).trim();
    if (lead) sections.push({ label: null, body: lead });
    marks.forEach((mark, i) => {
        const start = mark.index + mark[0].length;
        sections.push({ label: mark[1], body: structured.slice(start, marks[i + 1]?.index ?? structured.length).trim() });
    });
    return sections;
}

module.exports = { structureExplanation, explanationSections };
