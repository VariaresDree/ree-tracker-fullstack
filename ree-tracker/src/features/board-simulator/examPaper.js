// src/features/board-simulator/examPaper.js
// Builds a print-ready PRC-style board-exam packet (questionnaire + answer sheet
// + answer key) from a question pool, using jsPDF. Two goals drive the layout:
//   1. Readable, UN-mangled math — jsPDF's standard Helvetica only speaks
//      WinAnsi (Latin-1), so mathToText() converts LaTeX/unicode into a
//      WinAnsi-safe plain-text form. Anything it can't map is dropped rather
//      than rendered as tofu (the "�" you see in naive exports).
//   2. Space efficiency — options are laid out A/C over B/D in two columns and
//      questions flow continuously across pages (not one-per-page).
// It renders an ExamDraw (features/exam-export/drawExamPaper), the same set the
// LaTeX export renders, so a paper, its sheet and its key always agree. Every
// answer-sheet row draws one bubble per option (2-6), and the sheet and key
// continue onto new pages instead of dropping rows past the page bottom.
import { stripChoicePrefix } from '../../utils/sanitizeOptions';
import { fnv1a } from '../../utils/contentHash';
import { answerSheetLayout, pageCells, paginateColumnMajor } from '../exam-export/sheetLayout';

// --- Math → WinAnsi-safe text --------------------------------------------
const SUP = { 1: '¹', 2: '²', 3: '³' }; // ¹ ² ³ exist in Latin-1

// LaTeX command → readable text. Greek is spelled out (board papers do the
// same); a handful of symbols map to their Latin-1 glyph (× · ÷ ± ° µ).
const CMD = {
    // operators / relations
    times: '×', cdot: '·', div: '÷', pm: '±', mp: '-/+',
    leq: '<=', le: '<=', geq: '>=', ge: '>=', neq: '!=', ne: '!=', approx: '~=',
    equiv: '=', propto: ' proportional to ', sim: '~', ll: '<<', gg: '>>',
    to: '->', rightarrow: '->', Rightarrow: '=>', leftarrow: '<-', leftrightarrow: '<->',
    // misc
    infty: 'infinity', partial: 'd', nabla: 'grad ', angle: 'angle ', perp: ' perpendicular to ',
    int: 'integral ', oint: 'contour integral ', sum: 'sum ', prod: 'product ',
    degree: '°', circ: '°', ohm: 'ohm', ldots: '...', cdots: '...', dots: '...',
    ast: '*', star: '*', prime: "'", cong: '~=', parallel: ' || ',
    // functions kept as-is
    cos: 'cos', sin: 'sin', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc',
    sinh: 'sinh', cosh: 'cosh', tanh: 'tanh', arctan: 'arctan', arcsin: 'arcsin', arccos: 'arccos',
    log: 'log', ln: 'ln', exp: 'exp', lim: 'lim', max: 'max', min: 'min', det: 'det',
    // greek
    alpha: 'alpha', beta: 'beta', gamma: 'gamma', Gamma: 'Gamma', delta: 'delta', Delta: 'Delta',
    epsilon: 'epsilon', varepsilon: 'epsilon', zeta: 'zeta', eta: 'eta', theta: 'theta', Theta: 'Theta',
    vartheta: 'theta', iota: 'iota', kappa: 'kappa', lambda: 'lambda', Lambda: 'Lambda',
    mu: 'µ', nu: 'nu', xi: 'xi', Xi: 'Xi', rho: 'rho', varrho: 'rho', pi: 'pi', Pi: 'Pi',
    sigma: 'sigma', Sigma: 'Sigma', tau: 'tau', upsilon: 'upsilon', phi: 'phi', varphi: 'phi',
    Phi: 'Phi', chi: 'chi', psi: 'psi', Psi: 'Psi', omega: 'omega', Omega: 'ohm',
};

// Common unicode → WinAnsi-safe fallback (covers pre-rendered content that
// already contains real glyphs rather than LaTeX).
const UNI = {
    '−': '-', '–': '-', '—': '-', '⁄': '/',
    '√': 'sqrt', '∫': 'integral ', '∑': 'sum ', '∏': 'product ',
    '∞': 'infinity', '∂': 'd', '∇': 'grad ', '∠': 'angle ',
    '≤': '<=', '≥': '>=', '≠': '!=', '≈': '~=', '≡': '=',
    '→': '->', '←': '<-', '↔': '<->', '⇒': '=>',
    'Δ': 'Delta ', 'Ω': 'ohm', 'Σ': 'sum ', 'Φ': 'Phi', 'Θ': 'Theta',
    'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'ε': 'epsilon',
    'η': 'eta', 'θ': 'theta', 'κ': 'kappa', 'λ': 'lambda', 'μ': 'µ',
    'ν': 'nu', 'π': 'pi', 'ρ': 'rho', 'σ': 'sigma', 'τ': 'tau',
    'φ': 'phi', 'χ': 'chi', 'ψ': 'psi', 'ω': 'omega',
    '₀': '_0', '₁': '_1', '₂': '_2', '₃': '_3', '₄': '_4',
    '₅': '_5', '₆': '_6', '₇': '_7', '₈': '_8', '₉': '_9',
    '⁰': '^0', '⁴': '^4', '⁵': '^5', '⁶': '^6', '⁷': '^7',
    '⁸': '^8', '⁹': '^9',
};

const supOrCaret = (g) => {
    if (/^\d$/.test(g) && SUP[g]) return SUP[g];
    return g.length === 1 ? '^' + g : '^(' + g + ')';
};

export function mathToText(input) {
    if (input == null) return '';
    let s = String(input);

    // 1. Strip math delimiters + spacing macros, keep inner content.
    s = s
        .replace(/\$\$([\s\S]*?)\$\$/g, ' $1 ')
        .replace(/\$([^$]*)\$/g, ' $1 ')
        .replace(/\\\[([\s\S]*?)\\\]/g, ' $1 ')
        .replace(/\\\(([\s\S]*?)\\\)/g, ' $1 ')
        .replace(/\\left|\\right/g, '')
        .replace(/\\(?:,|;|:|!|quad|qquad)/g, ' ')
        .replace(/\\[ ~]/g, ' ')            // \  and \~ explicit spaces
        .replace(/\^\{?\\circ\}?/g, '°')    // ^\circ / ^{\circ} degree
        .replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, '$1')
        .replace(/\\displaystyle/g, '');

    // 2. Fractions + roots — the [^{}] groups only match innermost (brace-free)
    // content, so loop to peel nested \frac/\sqrt from the inside out.
    let prev;
    let guard = 0;
    do {
        prev = s;
        s = s
            .replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, '($2)^(1/$1)')
            .replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)')
            .replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
        guard++;
    } while (s !== prev && guard < 8);

    // 4. Named commands (greek + operators + functions).
    s = s.replace(/\\([a-zA-Z]+)/g, (m, name) => (name in CMD ? CMD[name] : name));

    // 5. Super/subscripts.
    s = s
        .replace(/\^\{([^{}]*)\}/g, (m, g) => supOrCaret(g))
        .replace(/\^(\d)/g, (m, d) => SUP[d] || '^' + d)
        .replace(/\^([A-Za-z])/g, '^$1')
        .replace(/_\{([^{}]*)\}/g, '_$1');

    // 6. Unescape LaTeX-escaped punctuation, then drop any leftover \cmd{arg}/
    // \cmd and stray braces.
    s = s
        .replace(/\\([$%&#_(){}[\]|.,])/g, '$1')
        .replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, '$1')
        .replace(/\\[a-zA-Z]+/g, ' ')
        .replace(/[{}]/g, '');

    // 7. Normalise remaining non-ASCII to WinAnsi-safe text: map known glyphs,
    // keep Latin-1 (<=0xFF) as-is, DROP anything else so nothing renders as tofu.
    s = s.replace(/[\u0080-\uFFFF]/g, (ch) => {
        if (UNI[ch] != null) return UNI[ch];
        return ch.charCodeAt(0) <= 0xFF ? ch : '';
    });

    // 8. Whitespace tidy (+ space a coefficient before an adjacent sqrt so
    // "2pisqrt(LC)" reads as "2pi sqrt(LC)").
    return s
        .replace(/\^\s*°/g, '°')            // leftover superscript-degree -> °
        .replace(/([0-9A-Za-z])(sqrt\()/g, '$1 $2')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        .replace(/\s+([,;.])/g, '$1')
        .trim();
}

// --- helpers --------------------------------------------------------------
const PT_TO_MM = 0.3527777778;
const lineHeight = (pt, factor = 1.15) => pt * PT_TO_MM * factor;
const letterOf = (i) => String.fromCharCode(65 + i);

export const SUBJECT_CODE = { EE: 'EE', ESAS: 'ESAS', Mathematics: 'MATH', Math: 'MATH', Blended: 'BLENDED' };

export function formatDuration(mins) {
    const m = Math.max(0, Math.round(mins || 0));
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (h && r) return `${h} hr ${r} min`;
    if (h) return `${h} hour${h > 1 ? 's' : ''}`;
    return `${r} minutes`;
}

// --- Answer-key helpers (exported + unit-tested) -------------------------
// Column-major position: fill each column top-to-bottom before moving right.
// PH answer-sheet/key convention — e.g. 50 items in 5 cols of 10 → col 0 =
// items 1..10, col 1 = 11..20, … (this is what the answer SHEET already did;
// the answer KEY used to be row-major and disagreed with it).
export function columnMajorPosition(idx, rows) {
    const r = Math.max(1, rows);
    return { col: Math.floor(idx / r), row: idx % r };
}

const normAns = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

// Map a question's stored answer to its option LETTER (A/B/C/…), matching the
// cleaned option order that gets PRINTED so the key always agrees with the
// questionnaire. Normalizes whitespace/case before comparing — the old exact
// string-equality silently emitted '-' on trivial mismatches. Returns
// { letter, matched } so the caller can warn on unmatched items instead of
// shipping a silent '-' key. `cleanedOptions` (already mathToText'd) may be
// passed to avoid recomputing.
export function answerLetterFor(question, cleanedOptions) {
    const options = cleanedOptions
        || (question.options || []).map((o) => mathToText(stripChoicePrefix(o)));
    const target = mathToText(stripChoicePrefix(question.answer || ''));
    let idx = options.findIndex((o) => normAns(o) === normAns(target));
    // Fallback: compare RAW option/answer text (pre-mathToText), in case the
    // transform diverged between the two sides.
    if (idx < 0 && Array.isArray(question.options)) {
        idx = question.options.findIndex((o) => normAns(o) === normAns(question.answer));
    }
    return { letter: idx >= 0 ? letterOf(idx) : '-', matched: idx >= 0 };
}

// Deterministic exam identity for the QR + printed codes. setId binds to the
// ordered question set; keyVersion is a checksum of the answer key (the LETTERS
// only — never the answer text), so the QR identifies the correct key page
// without leaking answers. Same content → same codes on every export.
export function deriveExamIdentity(pool, answerLetters) {
    const setId = fnv1a((pool || []).map((q) => q.id || q.text || '').join('|'));
    const keyVersion = fnv1a((answerLetters || []).join(''));
    return { setId, keyVersion };
}

// Stable SET letter from the set id (was a random label regenerated every
// export: useless for matching a filled sheet to its key).
export function setLabelFor(setId) {
    const idx = [...String(setId || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
    return 'SET ' + letterOf(idx);
}

const PART = ['I', 'II', 'III', 'IV', 'V'];
/** "Part II" for the second section of a mixed paper. */
export const partLabel = (index) => `Part ${PART[index] || index + 1}`;

const MANILA_DATE = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});
const MANILA_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });
/** "Tuesday, October 20, 2026": the paper's date, in Manila. */
export const formatPaperDate = (iso) => MANILA_DATE.format(iso ? new Date(iso) : new Date());
/** "2026-10-20": the paper's date for file names, in Manila. */
export const paperDay = (iso) => MANILA_DAY.format(iso ? new Date(iso) : new Date());

// jsPDF page formats. PH long bond is 8.5 x 13 in.
const JSPDF_FORMAT = { a4: 'a4', letter: 'letter', long: [215.9, 330.2] };

// --- main builder ---------------------------------------------------------
/**
 * @param {object} opts
 * @param {object} opts.draw       an ExamDraw (drawExamPaper)
 * @param {'a4'|'letter'|'long'} [opts.paper]
 * @param {{ paper?: boolean, sheet?: boolean, key?: boolean }} [opts.documents]
 * @param {string|null} [opts.output]  'arraybuffer'/'blob' returns the bytes instead of saving
 */
export async function generateExamPaper({ draw, paper = 'a4', documents = { paper: true, sheet: true, key: true }, output = null }) {
    if (!draw || !Array.isArray(draw.items) || draw.items.length === 0) {
        throw new Error('No questions available for the selected configuration.');
    }
    const want = { paper: !!documents?.paper, sheet: !!documents?.sheet, key: !!documents?.key };
    if (!want.paper && !want.sheet && !want.key) throw new Error('Choose at least one part to print.');

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: JSPDF_FORMAT[paper] || 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const M = 12;                       // page margin (mm)
    const contentW = pageW - M * 2;
    const footerY = pageH - 8;
    const bottomLimit = pageH - 14;     // leave room for footer

    const plan = draw.plan || {};
    const code = plan.code || 'EE';
    const duration = formatDuration(plan.timeAllotmentMins);
    const sections = Array.isArray(draw.sections) ? draw.sections : [];
    const showSections = plan.kind === 'blended' || sections.length > 1;

    // Clean per item once so the questionnaire, sheet and key agree. The
    // letters come from the draw, which matched them against this order.
    const items = draw.items.map((it) => ({
        n: it.n,
        stem: mathToText(it.text || ''),
        options: (it.options || []).map((o) => mathToText(stripChoicePrefix(o))),
        answerLetter: it.answerLetter || '-',
    }));
    const unmatched = draw.items.filter((it) => !(it.answerIndex >= 0)).length;
    const { setId, keyVersion } = draw;
    const setLabel = draw.setLabel || setLabelFor(setId);
    const idLine = `Set ${setId} · Key v${keyVersion}`;

    let y = M;
    let started = false;
    const setFont = (pt, style = 'normal') => { doc.setFont('helvetica', style); doc.setFontSize(pt); };
    // Each part starts on a fresh page (the first one on page 1).
    const startPart = () => {
        if (started) doc.addPage();
        started = true;
        y = M;
    };

    // ---- Questionnaire ----
    if (want.paper) {
        startPart();
        setFont(12, 'bold');
        doc.text('REGISTERED ELECTRICAL ENGINEER Pre-board Examination', M, y + 3);
        setFont(9, 'normal');
        doc.text(formatPaperDate(draw.generatedAt), M, y + 9);
        doc.text(`Time Allotment: ${duration}`, pageW - M, y + 9, { align: 'right' });
        y += 12;
        doc.setLineWidth(0.4);
        doc.line(M, y, pageW - M, y);
        y += 5;
        setFont(11, 'bold');
        doc.text(code, M, y);
        doc.text(setLabel, pageW - M, y, { align: 'right' });
        y += 2;
        doc.setLineWidth(0.2);
        doc.line(M, y, pageW - M, y);
        y += 5;

        setFont(8.5, 'normal');
        const instruction =
            'INSTRUCTION: Select the correct answer for each of the following questions. Mark only the answer ' +
            'for each item by shading the box corresponding to the letter of your choice on the answer sheet ' +
            'provided. STRICTLY NO ERASURES ALLOWED. Use pencil no. 2 only. Please do not write anything on ' +
            'this questionnaire.';
        const instrLines = doc.splitTextToSize(instruction, contentW);
        const instrLH = lineHeight(8.5);
        doc.text(instrLines, M, y);
        y += instrLines.length * instrLH + 3;
        setFont(9.5, 'bold');
        doc.text('MULTIPLE CHOICE', M, y);
        y += lineHeight(9.5) + 2;

        // ---- Questions (continuous flow, 2-column options) ----
        const qPT = 9.5, oPT = 9;
        const qLH = lineHeight(qPT), oLH = lineHeight(oPT);
        const leftX = M + 4, rightX = M + contentW / 2 + 3;
        const optW = contentW / 2 - 7;     // wrap width per option column
        const rowGap = 1.3, qGap = 4.5;
        const sectionAt = new Map(sections.map((s, i) => [s.from, { s, i }]));

        const newContentPage = () => { doc.addPage(); y = M; };

        for (const it of items) {
            // A mixed paper's sections: "Part II, Engineering Sciences and
            // Allied Subjects (items 26-55)".
            const section = showSections && sectionAt.get(it.n);
            if (section) {
                const headH = lineHeight(10) + 3;
                if (y + headH + 18 > bottomLimit) newContentPage();
                setFont(10, 'bold');
                doc.text(`${partLabel(section.i)}, ${section.s.title} (items ${section.s.from}-${section.s.to})`, M, y + lineHeight(10) - 1);
                y += headH;
            }

            setFont(qPT, 'normal');
            const stemLines = doc.splitTextToSize(`${it.n}. ${it.stem}`, contentW);

            // Two-column options: the left half (A,B) stacks over the right half
            // (C,D), so row r pairs left[r] with right[r] — matching real board papers.
            setFont(oPT, 'normal');
            const n = it.options.length;
            const leftCount = Math.ceil(n / 2);
            const rows = [];
            for (let r = 0; r < leftCount; r++) {
                const li = r;
                const ri = leftCount + r;
                const left = doc.splitTextToSize(`${letterOf(li)}. ${it.options[li]}`, optW);
                const right = ri < n ? doc.splitTextToSize(`${letterOf(ri)}. ${it.options[ri]}`, optW) : null;
                rows.push({ left, right, h: Math.max(left.length, right ? right.length : 1) * oLH });
            }

            const blockH = stemLines.length * qLH + 1.5 + rows.reduce((s, r) => s + r.h + rowGap, 0) + qGap;

            // Keep a question intact on one page when it fits; else start a new page.
            if (y + blockH > bottomLimit && blockH <= pageH - M - 14) newContentPage();

            setFont(qPT, 'normal');
            // Draw stem (with per-line page-break safety for the rare oversized block).
            for (const ln of stemLines) {
                if (y + qLH > bottomLimit) newContentPage();
                doc.text(ln, M, y + qLH - 1);
                y += qLH;
            }
            y += 1.5;

            setFont(oPT, 'normal');
            for (const row of rows) {
                if (y + row.h > bottomLimit) newContentPage();
                if (row.left) doc.text(row.left, leftX, y + oLH - 1);
                if (row.right) doc.text(row.right, rightX, y + oLH - 1);
                y += row.h + rowGap;
            }
            y += qGap - rowGap;
        }
    }

    // ---- Answer sheet ----
    if (want.sheet) {
        startPart();
        // QR (top-right): encodes setId + keyVersion so a grader can scan a filled
        // sheet and match it to the correct printed ANSWER KEY page. It never
        // contains the answers themselves. Best-effort — a QR failure must not abort
        // the whole PDF.
        try {
            const mod = await import('qrcode');
            const toDataURL = mod.toDataURL || mod.default?.toDataURL;
            if (toDataURL) {
                const qrPayload = draw.qrPayload || `REE|${setId}|v${keyVersion}`;
                const qrUrl = await toDataURL(qrPayload, { margin: 0, width: 256, errorCorrectionLevel: 'M' });
                const qrSize = 20;
                doc.addImage(qrUrl, 'PNG', pageW - M - qrSize, M, qrSize, qrSize);
                setFont(6.5, 'normal');
                doc.setTextColor(120);
                doc.text('Scan to verify set', pageW - M - qrSize / 2, M + qrSize + 2.5, { align: 'center' });
                doc.setTextColor(0);
            }
        } catch { /* qrcode unavailable — the sheet still prints without the QR */ }

        setFont(13, 'bold');
        doc.text('ANSWER SHEET', pageW / 2, y + 4, { align: 'center' });
        setFont(9, 'normal');
        y += 9;
        doc.text(`${code}   ${setLabel}`, M, y);
        y += 4.5;
        setFont(7.5, 'normal');
        doc.setTextColor(120);
        doc.text(idLine, M, y);
        doc.setTextColor(0);
        y += 5;
        setFont(9, 'normal');
        doc.text('Name: ____________________________', M, y);
        y += 5;
        setFont(7.5, 'normal');
        doc.text('Shade the circle of your choice completely. Use pencil no. 2 only. STRICTLY NO ERASURES.', M, y);
        y += 6;

        // One bubble per option on every row (2-6); rows that don't fit
        // continue on the next page, column-major on each page.
        const maxOptions = Math.max(2, ...draw.items.map((it) => (it.options || []).length));
        const SHEET_FIRST_HEADER = y - M;
        const SHEET_NEXT_HEADER = 16;
        const layout = answerSheetLayout({
            count: items.length, maxOptions, paper, marginMm: M, bottomMm: pageH - bottomLimit,
            firstHeaderMm: SHEET_FIRST_HEADER, nextHeaderMm: SHEET_NEXT_HEADER,
            rowPitchMm: 8.4, bubblePitchMm: 8, numberColMm: 11, colGapMm: 4,
        });
        const bubbleR = 1.9;
        layout.pages.forEach((page, p) => {
            let gridY = y;
            if (p > 0) {
                doc.addPage();
                setFont(10, 'bold');
                doc.text(`ANSWER SHEET (continued) — ${code}   ${setLabel}`, M, M + 4);
                setFont(8, 'normal');
                doc.text(`Items ${page.from}-${page.to}     Name: ____________________________`, M, M + 9.5);
                gridY = M + SHEET_NEXT_HEADER;
            }
            setFont(8.5, 'normal');
            for (const cell of pageCells(layout, page)) {
                const it = draw.items[cell.n - 1];
                const cellX = M + cell.x;
                const cellY = gridY + cell.y;
                doc.text(`${cell.n}.`, cellX + 6, cellY + 3, { align: 'right' });
                const count = Math.max(0, (it.options || []).length);
                for (let b = 0; b < count; b++) {
                    const bx = cellX + 11 + b * 8;
                    const by = cellY + 2;
                    doc.setLineWidth(0.25);
                    doc.circle(bx, by, bubbleR, 'S');
                    doc.text(letterOf(b), bx, by + 1, { align: 'center' });
                }
            }
        });
    }

    // ---- Answer key ----
    if (want.key) {
        startPart();
        setFont(13, 'bold');
        doc.text('ANSWER KEY', pageW / 2, y + 4, { align: 'center' });
        setFont(9, 'normal');
        y += 9;
        doc.text(`${code}   ${setLabel}   (${items.length} items)`, M, y);
        y += 4.5;
        setFont(7.5, 'normal');
        doc.setTextColor(120);
        doc.text(`${idLine}  —  scan the answer-sheet QR to confirm a sheet matches this key`, M, y);
        if (showSections) {
            y += 4;
            doc.text(sections.map((s, i) => `${partLabel(i)} ${s.subject} ${s.from}-${s.to}`).join('   ·   '), M, y);
        }
        doc.setTextColor(0);
        y += 6;

        // Column-major (fill each column top-to-bottom), matching the answer sheet
        // and the PH convention. 5 columns → e.g. 50 items = 5 cols of 10. Rows
        // past the page continue on the next one.
        const akCols = 5;
        const akColW = contentW / akCols;
        const akRowH = 6;
        const firstRows = Math.floor((bottomLimit - y) / akRowH);
        const nextRows = Math.floor((bottomLimit - (M + 8)) / akRowH);
        const pages = paginateColumnMajor(items.length, akCols, firstRows, nextRows);
        pages.forEach((page, p) => {
            let startY = y;
            if (p > 0) {
                doc.addPage();
                setFont(10, 'bold');
                doc.text(`ANSWER KEY (continued) — ${code}   ${setLabel}`, M, M + 4);
                startY = M + 10;
            }
            setFont(9.5, 'normal');
            for (let n = page.from; n <= page.to; n++) {
                const it = items[n - 1];
                const { col, row } = columnMajorPosition(n - page.from, page.rows);
                const x = M + col * akColW;
                const ry = startY + row * akRowH;
                doc.text(`${it.n}.`, x + 7, ry, { align: 'right' });
                doc.setFont('helvetica', 'bold');
                doc.text(it.answerLetter, x + 9, ry);
                doc.setFont('helvetica', 'normal');
            }
        });
    }

    // ---- Footer (page X of Y) on every page ----
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        setFont(7.5, 'normal');
        doc.setTextColor(120);
        doc.text(`REE Pre-board — ${code} — ${setLabel} — ${setId}`, M, footerY);
        doc.text(`Page ${p} of ${total}`, pageW - M, footerY, { align: 'right' });
        doc.setTextColor(0);
    }

    const filename = `REE-${code}-${setLabel.replace(' ', '')}-${paperDay(draw.generatedAt)}.pdf`;
    // `unmatched` lets the caller warn when a stored answer couldn't be mapped to
    // an option (a silent '-' in the key) instead of shipping a broken key.
    const result = { pages: total, items: items.length, setLabel, setId, keyVersion, unmatched, filename };
    // `output` (e.g. 'arraybuffer'/'blob') returns the bytes instead of triggering
    // a browser download — used by tests/tooling; the UI path leaves it null.
    if (output) return { ...result, data: doc.output(output) };
    doc.save(filename);
    return result;
}
